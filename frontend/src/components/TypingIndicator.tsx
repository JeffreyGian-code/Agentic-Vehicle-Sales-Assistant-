import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Avatar } from './MessageBubble'

export function TypingIndicator({ startedAt, status }: { startedAt: number; status: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500)
    return () => clearInterval(id)
  }, [startedAt])
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex gap-3"
      aria-live="polite"
      aria-label="Assistant activity"
    >
      <Avatar pulse />
      <div className="min-w-0 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
          <div className="relative min-h-5 min-w-0 text-sm text-slate-500 dark:text-slate-400">
            <AnimatePresence mode="wait">
              <motion.span
                key={status}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                className="block"
              >
                {status}
              </motion.span>
            </AnimatePresence>
          </div>
          {elapsed >= 2 && <span className="font-mono text-xs text-slate-400 tabular-nums">{elapsed}s</span>}
        </div>
        {elapsed >= 20 && (
          <p className="mt-2 text-xs text-slate-400">Still waiting for the assistant. Status updates appear as work happens.</p>
        )}
      </div>
    </motion.div>
  )
}
