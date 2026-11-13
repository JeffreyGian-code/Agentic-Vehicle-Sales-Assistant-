import { useCallback, useEffect, useRef, useState } from 'react'
import { sendMessage } from '../api/client'
import { ChatError } from '../api/types'
import type { Conversation, Message } from '../lib/types'
import { readStorage, titleFrom, uid, writeStorage } from '../lib/utils'

const STORAGE_KEY = 'vsa.conversations'
const ACTIVE_KEY = 'vsa.activeId'
/** Fixed cooldown after a per-IP 429 (Retry-After is not readable cross-origin yet). */
export const IP_COOLDOWN_SECONDS = 60
/** Roughly how many replies fit in one conversation (5 LLM calls, see docs/frontend.md §5). */
export const EXPECTED_REPLIES_PER_CONVERSATION = 3

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
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    readStorage<Conversation[]>(STORAGE_KEY, []),
  )
  const [activeId, setActiveId] = useState<string | null>(() => {
    const id = readStorage<string | null>(ACTIVE_KEY, null)
    const list = readStorage<Conversation[]>(STORAGE_KEY, [])
    return id && list.some((c) => c.id === id) ? id : null
  })
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

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

  /**
   * Send a message. By default goes to the active conversation (creating one if none);
   * pass `fresh: true` to always start a new conversation.
   */
  const send = useCallback(
    async (rawText: string, opts: { fresh?: boolean } = {}) => {
      const text = rawText.trim()
      if (!text || pending || cooldown > 0) return

      let conv = opts.fresh ? null : active
      if (!conv || conv.ended) {
        conv = newConversation(text)
        const created = conv
        setConversations((prev) => [created, ...prev])
        setActiveId(created.id)
      }
      const convId = conv.id
      const sessionId = conv.sessionId

      update(convId, (c) => ({
        ...c,
        messages: [...c.messages, msg({ role: 'user', content: text })],
        updatedAt: Date.now(),
      }))

      const controller = new AbortController()
      abortRef.current = controller
      setPending({ conversationId: convId, startedAt: Date.now(), text, status: 'Connecting…', activeTools: {}, reply: '' })

      try {
        const res = await sendMessage(text, sessionId, controller.signal, (progress) => {
          if (controller.signal.aborted) return
          setPending((current) => {
            if (!current || current.conversationId !== convId) return current
            const activeTools = { ...current.activeTools }
            if (progress.run_id && progress.phase === 'tool_started') activeTools[progress.run_id] = progress.label
            if (progress.run_id && (progress.phase === 'tool_finished' || progress.phase === 'tool_failed')) delete activeTools[progress.run_id]
            const tools = Object.values(activeTools)
            return { ...current, activeTools, status: tools.length ? tools.join(' · ') : progress.label }
          })
        }, (id) => {
          if (!controller.signal.aborted) update(convId, (c) => ({ ...c, sessionId: id }))
        }, (delta) => {
          if (controller.signal.aborted) return
          setPending((current) => current?.conversationId === convId
            ? { ...current, reply: (delta.reset ? '' : current.reply) + delta.text }
            : current)
        })
        update(convId, (c) => ({
          ...c,
          sessionId: res.session_id,
          replies: c.replies + 1,
          messages: [...c.messages, msg({ role: 'assistant', content: res.reply })],
          updatedAt: Date.now(),
        }))
      } catch (err) {
        if (controller.signal.aborted) {
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
        if (e.kind === 'ip-rate-limit') setCooldown(IP_COOLDOWN_SECONDS)
        update(convId, (c) => ({
          ...c,
          ended: c.ended || e.kind === 'conversation-limit',
          messages: [
            ...c.messages,
            msg({ role: 'error', errorKind: e.kind, content: e.message, retryText: text }),
          ],
          updatedAt: Date.now(),
        }))
      } finally {
        abortRef.current = null
        setPending(null)
      }
    },
    [active, cooldown, pending, update],
  )

  /** Remove a failed exchange (user message + error) and send it again. */
  const retry = useCallback(
    (errorId: string) => {
      if (!active || pending) return
      const idx = active.messages.findIndex((m) => m.id === errorId)
      const err = active.messages[idx]
      if (!err?.retryText) return
      const prev = active.messages[idx - 1]
      const drop = new Set([errorId, ...(prev?.role === 'user' ? [prev.id] : [])])
      update(active.id, (c) => ({ ...c, messages: c.messages.filter((m) => !drop.has(m.id)) }))
      void send(err.retryText)
    },
    [active, pending, send, update],
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const newChat = useCallback(() => {
    if (pending) abortRef.current?.abort()
    setActiveId(null)
  }, [pending])

  const select = useCallback((id: string) => setActiveId(id), [])

  const remove = useCallback(
    (id: string) => {
      if (pending?.conversationId === id) abortRef.current?.abort()
      setConversations((prev) => prev.filter((c) => c.id !== id))
      setActiveId((cur) => (cur === id ? null : cur))
    },
    [pending],
  )

  const rename = useCallback(
    (id: string, title: string) => update(id, (c) => ({ ...c, title: title.trim() || c.title })),
    [update],
  )

  const clearAll = useCallback(() => {
    abortRef.current?.abort()
    setConversations([])
    setActiveId(null)
  }, [])

  return {
    conversations,
    active,
    activeId,
    pending,
    cooldown,
    send,
    retry,
    stop,
    newChat,
    select,
    remove,
    rename,
    clearAll,
  }
}
