import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Avatar } from './MessageBubble'

function stagesFor(text: string) {
  const t = text.toLowerCase()
  if (/emi|loan|interest|tenure/.test(t)) {
    return ['Reading your question…', 'Crunching the EMI numbers…', 'Preparing the breakdown…']
  }
  return ['Reading your question…', 'Searching the inventory…', 'Comparing matching vehicles…', 'Writing a reply…']
}

export function TypingIndicator({ startedAt, text }: { startedAt: number; text: string }) {
  const [elapsed, setElapsed] = useState(0)
  const stages = stagesFor(text)

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500)
    return () => clearInterval(id)
  }, [startedAt])

  const stage = stages[Math.min(Math.floor(elapsed / 3), stages.length - 1)]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex gap-3"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <Avatar pulse />
      <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 animate-blink rounded-full bg-brand-500"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <div className="relative h-5 min-w-44 overflow-hidden text-sm text-slate-500 dark:text-slate-400">
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                className="absolute inset-0 whitespace-nowrap"
              >
                {stage}
              </motion.span>
            </AnimatePresence>
          </div>
          {elapsed >= 2 && <span className="font-mono text-xs text-slate-400 tabular-nums">{elapsed}s</span>}
        </div>
        {elapsed >= 20 && (
          <p className="mt-2 text-xs text-slate-400">Still working, the free model can be slow. Hang tight.</p>
        )}
      </div>
    </motion.div>
  )
}
