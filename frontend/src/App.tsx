import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { WifiOff } from 'lucide-react'
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
          />

          <AnimatePresence>
            {health.services && (
              <div className="relative border-b border-slate-200 px-4 py-2 text-xs dark:border-slate-800" aria-live="polite">
                <p className="mb-1 text-slate-500">Last checked at {health.checkedAt}. Click the status button to check again.</p>
                {(['api', 'database', 'ai'] as const).map((name) => {
                  const check = health.services![name]
                  return (
                    <p key={name} className={check.status === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                      <strong>{name === 'api' ? 'API' : name === 'ai' ? 'AI provider' : 'Database'}:</strong> {check.detail}
                    </p>
                  )
                })}
                <p className="mt-1 text-slate-500">AI check verifies provider access; model generation is not tested.</p>
              </div>
            )}
            {health.status === 'offline' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="relative overflow-hidden"
              >
                <div className="flex items-center justify-center gap-2 bg-red-50 px-4 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  <WifiOff className="size-3.5 shrink-0" />
                  <span>
                    Can&apos;t complete the status check at <code className="font-mono">{API_URL}</code>. Try again shortly or check the backend.
                  </span>
                  <button onClick={health.refresh} className="font-semibold underline underline-offset-2">
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
            inputRef={inputRef}
          />
        </main>
      </div>
    </MotionConfig>
  )
}
