import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { WifiOff, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL } from './api/client'
import { ChatHeader } from './components/ChatHeader'
import { Composer } from './components/Composer'
import { EmptyState } from './components/EmptyState'
import { MessageList } from './components/MessageList'
import { Sidebar } from './components/Sidebar'
import { useChat } from './hooks/useChat'
import { useHealth } from './hooks/useHealth'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const chat = useChat()
  const health = useHealth()
  const { theme, cycle } = useTheme()
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(true)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { send, stop, pending } = chat

  /** Send from the composer: clears the draft. */
  const handleComposerSend = useCallback(
    (text: string) => {
      setDraft('')
      void send(text)
    },
    [send],
  )

  /** Send from a starter card or suggestion chip: keeps whatever the user was typing. */
  const handleQuickSend = useCallback((text: string) => void send(text), [send])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)
      if (e.key === 'Escape' && pending) {
        stop()
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, stop])

  const active = chat.active

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full overflow-hidden">
        <Sidebar
          conversation={active}
          pending={pending}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="relative flex min-w-0 flex-1 flex-col">
          {/* Decorative background glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-500/10 to-transparent dark:from-brand-500/[0.07]" />

          <ChatHeader
            conversation={active}
            health={health.status}
            onRefreshHealth={health.refresh}
            theme={theme}
            onCycleTheme={cycle}
            onOpenSidebar={() => setSidebarOpen(true)}
            onReset={() => { chat.reset(); setDraft(''); inputRef.current?.focus() }}
            onToggleNote={() => setNoteOpen((open) => !open)}
            noteOpen={noteOpen}
            pending={!!pending}
            calls={chat.usage.calls}
            callLimit={chat.usage.limit}
          />

          {noteOpen && (
            <div className="relative z-30">
            <aside id="developer-note" aria-labelledby="developer-note-title" className="absolute right-3 top-2 w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border border-brand-200 bg-white p-4 shadow-lg sm:right-5 dark:border-slate-700 dark:bg-slate-900">
              <button type="button" onClick={() => setNoteOpen(false)} aria-label="Close developer note" className="float-right rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="size-4" /></button>
              <h2 id="developer-note-title" className="mb-2 text-sm font-semibold">Note from the Dev</h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">Hi! Jeffrey here! I’m so happy you’re here. This app uses a free AI model, so replies may take a little longer. Each session gets 7 calls, renewed after 24 hours. I know that’s a small budget, but it helps keep this shared app available for everyone. Thanks for trying it!</p>
            </aside>
            </div>
          )}

          <AnimatePresence>
            {health.services && (
              <button type="button" onClick={health.dismiss} className="relative w-full border-b border-slate-200 px-4 py-2 text-left text-xs dark:border-slate-800" aria-live="polite" aria-label="Dismiss system status">
                <p className="mb-1 text-slate-500">Last checked at {health.checkedAt}. Click to dismiss · Closes in {health.secondsRemaining} {health.secondsRemaining === 1 ? 'second' : 'seconds'}.</p>
                {(['api', 'database', 'ai'] as const).map((name) => {
                  const check = health.services![name]
                  return (
                    <p key={name} className={check.status === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                      <strong>{name === 'api' ? 'API' : name === 'ai' ? 'AI provider' : 'Database'}:</strong> {check.detail}
                    </p>
                  )
                })}
                <p className="mt-1 text-slate-500">AI check verifies provider access; model generation is not tested.</p>
              </button>
            )}
            {health.status === 'offline' && health.services && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative overflow-hidden"
              >
                <div onClick={health.dismiss} className="flex cursor-pointer items-center justify-center gap-2 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  <WifiOff className="size-3.5 shrink-0" />
                  <span>
                    Can&apos;t complete the status check at <code className="font-mono">{API_URL}</code>. Try again shortly or check the backend.
                  </span>
                  <button onClick={(event) => { event.stopPropagation(); void health.refresh() }} className="font-semibold underline underline-offset-2">
                    Retry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex min-h-0 flex-1 flex-col">
            {active && active.messages.length > 0 ? (
              <MessageList
                conversation={active}
                pending={pending}
                cooldown={chat.cooldown}
                budgetExhausted={chat.usage.calls >= chat.usage.limit}
                onRetry={chat.retry}
                onSuggestion={handleQuickSend}
              />
            ) : (
              <div className="flex min-h-0 flex-1 overflow-y-auto">
                <EmptyState onPick={handleQuickSend} />
              </div>
            )}
          </div>

          <Composer
            value={draft}
            onChange={setDraft}
            onSend={handleComposerSend}
            onStop={stop}
            pending={!!pending}
            cooldown={chat.cooldown}
            budgetExhausted={chat.usage.calls >= chat.usage.limit}
            budgetResetsAt={chat.usage.resets_at}
            inputRef={inputRef}
          />
        </main>
      </div>
    </MotionConfig>
  )
}
