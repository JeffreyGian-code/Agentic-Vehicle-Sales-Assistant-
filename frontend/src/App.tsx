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

  const { send, newChat, stop, pending } = chat

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

  const handleNewChat = useCallback(
    (carryText?: string) => {
      if (carryText) {
        void send(carryText, { fresh: true })
        return
      }
      newChat()
      setDraft('')
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [newChat, send],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        handleNewChat()
      } else if (e.key === 'Escape' && pending) {
        stop()
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNewChat, pending, stop])

  const active = chat.active

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-full overflow-hidden">
        <Sidebar
          conversations={chat.conversations}
          activeId={chat.activeId}
          pendingId={pending?.conversationId ?? null}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelect={chat.select}
          onNew={() => handleNewChat()}
          onDelete={chat.remove}
          onRename={chat.rename}
          onClearAll={chat.clearAll}
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
                    Can&apos;t reach the API at <code className="font-mono">{API_URL}</code>. Is the backend running?
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
                onNewChat={handleNewChat}
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
            onNewChat={() => handleNewChat()}
            pending={!!pending}
            cooldown={chat.cooldown}
            ended={!!active?.ended}
            inputRef={inputRef}
          />
        </main>
      </div>
    </MotionConfig>
  )
}
