import { useCallback, useEffect, useRef, useState } from 'react'
import { getChatUsage, sendMessage, USE_MOCK, type ChatUsage } from '../api/client'
import { ChatError } from '../api/types'
import type { Conversation, Message, TraceRun } from '../lib/types'
import { readStorage, titleFrom, uid, writeStorage } from '../lib/utils'

const STORAGE_KEY = 'vsa.conversation'
const ACTIVE_KEY = 'vsa.activeId'
const SESSION_KEY = 'vsa.sessionId'
const USAGE_KEY = 'vsa.usage'
/** Fixed cooldown after a per-IP 429 (Retry-After is not readable cross-origin yet). */
export const IP_COOLDOWN_SECONDS = 60
export interface PendingRequest {
  conversationId: string
  startedAt: number
  text: string
  status: string
  activeTools: Record<string, string>
  reply: string
}

function newConversation(firstText: string): Conversation {
  const now = Date.now()
  return {
    id: uid(),
    title: titleFrom(firstText),
    sessionId: null,
    messages: [],
    createdAt: now,
    updatedAt: now,
    ended: false,
    replies: 0,
  }
}

function msg(partial: Omit<Message, 'id' | 'createdAt'>): Message {
  return { id: uid(), createdAt: Date.now(), ...partial }
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = readStorage<Conversation[]>(STORAGE_KEY, readStorage<Conversation[]>('vsa.conversations', []))
    const selected = readStorage<string | null>(ACTIVE_KEY, null)
    const conversation = saved.find((c) => c.id === selected) ?? saved[0]
    return conversation ? [{ ...conversation, ended: false, traces: (conversation.traces ?? []).map((run) =>
      run.status === 'running' ? { ...run, status: 'cancelled', finishedAt: Date.now(), error: 'The page was closed before this request finished.' } : run,
    ) }] : []
  })
  const activeId = conversations[0]?.id ?? null
  const [sessionId] = useState(() => {
    const id = readStorage<string | null>(SESSION_KEY, null) ?? conversations[0]?.sessionId ?? uid()
    writeStorage(SESSION_KEY, id)
    return id
  })
  const [usage, setUsage] = useState<ChatUsage>(() => readStorage(USAGE_KEY, { calls: 0, limit: 7, resets_at: null }))
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const refreshUsage = useCallback(async () => {
    if (USE_MOCK) {
      setUsage((current) => current.resets_at && current.resets_at * 1000 <= Date.now()
        ? { calls: 0, limit: 7, resets_at: null } : current)
      return
    }
    try { setUsage(await getChatUsage(sessionId)) } catch { /* Keep the last known count when offline. */ }
  }, [sessionId])

  useEffect(() => {
    const initial = setTimeout(() => void refreshUsage(), 0)
    const timer = setInterval(() => void refreshUsage(), 60_000)
    const sync = () => void refreshUsage()
    window.addEventListener('focus', sync)
    return () => { clearTimeout(initial); clearInterval(timer); window.removeEventListener('focus', sync) }
  }, [refreshUsage])
  useEffect(() => writeStorage(USAGE_KEY, usage), [usage])

  // Persist
  useEffect(() => writeStorage(STORAGE_KEY, conversations), [conversations])
  useEffect(() => writeStorage(ACTIVE_KEY, activeId), [activeId])

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const active = conversations.find((c) => c.id === activeId) ?? null

  const update = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  /** Every request continues the same locally persisted conversation. */
  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim()
      if (!text || abortRef.current || cooldown > 0 || (usage.calls >= usage.limit && (!usage.resets_at || usage.resets_at * 1000 > Date.now()))) return

      const conv = active ?? newConversation(text)
      if (!active) setConversations([conv])
      const convId = conv.id

      const traceId = uid()
      const trace: TraceRun = { id: traceId, input: text, startedAt: Date.now(), status: 'running', steps: [] }
      const updateTrace = (fn: (run: TraceRun) => TraceRun) => update(convId, (c) => ({
        ...c, traces: (c.traces ?? []).map((run) => run.id === traceId ? fn(run) : run),
      }))
      update(convId, (c) => ({
        ...c,
        traces: [...(c.traces ?? []), trace],
        messages: [...c.messages, msg({ role: 'user', content: text })],
        updatedAt: Date.now(),
      }))

      const controller = new AbortController()
      abortRef.current = controller
      setPending({ conversationId: convId, startedAt: Date.now(), text, status: 'Connecting…', activeTools: {}, reply: '' })

      try {
        const res = await sendMessage(text, sessionId, controller.signal, (progress) => {
          if (controller.signal.aborted) return
          updateTrace((run) => ({ ...run, steps: [...run.steps, { ...progress, id: uid(), timestamp: Date.now() }] }))
          setPending((current) => {
            if (!current || current.conversationId !== convId) return current
            const activeTools = { ...current.activeTools }
            if (progress.run_id && progress.phase === 'tool_started') activeTools[progress.run_id] = progress.label
            if (progress.run_id && (progress.phase === 'tool_finished' || progress.phase === 'tool_failed')) delete activeTools[progress.run_id]
            const tools = Object.values(activeTools)
            return { ...current, activeTools, status: tools.length ? tools.join(' · ') : progress.label }
          })
        }, (id) => {
          setUsage((current) => {
            const expired = current.resets_at !== null && current.resets_at * 1000 <= Date.now()
            return { ...current, calls: (expired ? 0 : current.calls) + 1, resets_at: expired || !current.resets_at ? Date.now() / 1000 + 86400 : current.resets_at }
          })
          if (!controller.signal.aborted) update(convId, (c) => ({ ...c, sessionId: id, resetContext: false }))
        }, (delta) => {
          if (controller.signal.aborted) return
          setPending((current) => current?.conversationId === convId
            ? { ...current, reply: (delta.reset ? '' : current.reply) + delta.text }
            : current)
        }, conv.resetContext ?? false)
        updateTrace((run) => ({ ...run, status: 'completed', finishedAt: Date.now(), reply: res.reply }))
        update(convId, (c) => ({
          ...c,
          sessionId: res.session_id,
          replies: c.replies + 1,
          messages: [...c.messages, msg({ role: 'assistant', content: res.reply })],
          updatedAt: Date.now(),
        }))
      } catch (err) {
        if (controller.signal.aborted) {
          updateTrace((run) => ({ ...run, status: 'cancelled', finishedAt: Date.now(), error: 'You stopped this request.' }))
          update(convId, (c) => ({
            ...c,
            messages: [
              ...c.messages,
              msg({ role: 'error', errorKind: 'cancelled', content: 'You stopped this request.', retryText: text }),
            ],
          }))
          return
        }
        const e =
          err instanceof ChatError
            ? err
            : new ChatError('server', 'Something went wrong while processing your request.')
        updateTrace((run) => ({ ...run, status: 'error', finishedAt: Date.now(), error: e.message }))
        if (e.kind === 'ip-rate-limit') setCooldown(IP_COOLDOWN_SECONDS)
        update(convId, (c) => ({
          ...c,
          ended: false,
          messages: [
            ...c.messages,
            msg({ role: 'error', errorKind: e.kind, content: e.message, retryText: text }),
          ],
          updatedAt: Date.now(),
        }))
      } finally {
        abortRef.current = null
        setPending(null)
        void refreshUsage()
      }
    },
    [active, cooldown, update, sessionId, usage, refreshUsage],
  )

  /** Remove a failed exchange (user message + error) and send it again. */
  const retry = useCallback(
    (errorId: string) => {
      if (!active || pending || cooldown > 0 || usage.calls >= usage.limit) return
      const idx = active.messages.findIndex((m) => m.id === errorId)
      const err = active.messages[idx]
      if (!err?.retryText) return
      const prev = active.messages[idx - 1]
      const drop = new Set([errorId, ...(prev?.role === 'user' ? [prev.id] : [])])
      update(active.id, (c) => ({ ...c, messages: c.messages.filter((m) => !drop.has(m.id)) }))
      void send(err.retryText)
    },
    [active, pending, cooldown, usage, send, update],
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    if (abortRef.current) return
    setConversations([{ ...newConversation(''), sessionId, resetContext: true }])
  }, [sessionId])

  return { active, pending, cooldown, send, retry, stop, reset, usage }
}
