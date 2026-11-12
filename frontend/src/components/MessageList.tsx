import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, CornerDownRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PendingRequest } from '../hooks/useChat'
import type { Conversation, Message } from '../lib/types'
import { formatDay } from '../lib/utils'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

interface Props {
  conversation: Conversation
  pending: PendingRequest | null
  cooldown: number
  onRetry: (id: string) => void
  onNewChat: (carryText?: string) => void
  onSuggestion: (text: string) => void
}

/** Contextual follow-ups based on the latest assistant reply. */
function followUps(reply: Message): string[] {
  const t = reply.content.toLowerCase()
  const out: string[] = []
  const isList = /\|.*\|/.test(reply.content) || /^\s*(\d+\.|[-*])\s/m.test(reply.content)
  if (t.includes('emi') && t.includes('tenure')) {
    out.push('Compare with a 7 year tenure', 'What if the rate is 8.5%?')
  } else if (isList && /₹|lakh|price/.test(t)) {
    out.push('Calculate EMI for the cheapest one', 'Show only automatic options', 'Which one has the best mileage?')
  }
  if (t.includes('?') && out.length === 0) out.push('Yes, please', 'Show me other options')
  return out.slice(0, 3)
}

export function MessageList({ conversation, pending, cooldown, onRetry, onNewChat, onSuggestion }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const isPendingHere = pending?.conversationId === conversation.id
  const messages = conversation.messages
  const last = messages[messages.length - 1]

  // Keep pinned to the bottom when new content arrives, unless the user scrolled up.
  useEffect(() => {
    const el = scrollRef.current
    if (el && atBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages.length, isPendingHere, atBottom])

  // Jump to bottom when switching conversations.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation.id])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  const suggestions =
    !isPendingHere && !conversation.ended && last?.role === 'assistant' ? followUps(last) : []

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 py-6 sm:px-6" aria-live="polite">
          {messages.map((m, i) => {
            const prev = messages[i - 1]
            const showDay = !prev || formatDay(prev.createdAt) !== formatDay(m.createdAt)
            return (
              <div key={m.id} className="flex flex-col gap-5">
                {showDay && (
                  <div className="flex items-center gap-3 text-[11px] font-medium tracking-wider text-slate-400 uppercase">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    {formatDay(m.createdAt)}
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>
                )}
                <MessageBubble
                  message={m}
                  onRetry={onRetry}
                  onNewChat={onNewChat}
                  canRetry={!pending && i === messages.length - 1}
                  cooldown={cooldown}
                />
              </div>
            )
          })}

          <AnimatePresence>
            {isPendingHere && pending && <TypingIndicator key="typing" startedAt={pending.startedAt} text={pending.text} />}
          </AnimatePresence>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-11">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSuggestion(s)}
                  disabled={cooldown > 0}
                  className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/60 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:border-brand-400 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                >
                  <CornerDownRight className="size-3" />
                  {s}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {!atBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-800/90"
          >
            <ArrowDown className="size-3.5" /> Jump to latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
