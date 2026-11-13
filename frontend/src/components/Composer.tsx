import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Calculator, Clock, Square } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'
import { MAX_MESSAGE_LENGTH } from '../api/types'
import { IP_COOLDOWN_SECONDS } from '../hooks/useChat'
import { cn } from '../lib/utils'
import { EmiQuickCalc } from './EmiQuickCalc'

const QUICK_CHIPS = ['Under 10 lakh', 'Automatic', 'Diesel', 'SUV', 'Sedan', 'Electric']

interface Props {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  onStop: () => void
  pending: boolean
  cooldown: number
  budgetExhausted: boolean
  budgetResetsAt: number | null
  inputRef: RefObject<HTMLTextAreaElement | null>
}

export function Composer({ value, onChange, onSend, onStop, pending, cooldown, budgetExhausted, budgetResetsAt, inputRef }: Props) {
  const [calcOpen, setCalcOpen] = useState(false)
  const trimmed = value.trim()
  const length = value.length
  const tooLong = length > MAX_MESSAGE_LENGTH
  const blocked = pending || cooldown > 0 || budgetExhausted
  const canSend = !!trimmed && !tooLong && !blocked

  // Auto-grow the textarea.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [value, inputRef])

  const submit = () => {
    if (!canSend) return
    onSend(trimmed)
  }

  const addChip = (chip: string) => {
    const base = value.trimEnd()
    onChange(base ? `${base}, ${chip.toLowerCase()}` : `Find ${chip.toLowerCase()} cars`)
    inputRef.current?.focus()
  }


  return (
    <div className="px-3 pb-4 sm:px-6">
      <div className="relative mx-auto max-w-3xl">
        {budgetExhausted && (
          <p role="status" className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            You’ve used all 7 calls.{budgetResetsAt ? ` Your budget renews ${new Date(budgetResetsAt * 1000).toLocaleString()}.` : ''} Resetting the conversation keeps this limit.
          </p>
        )}
        <AnimatePresence>
          {calcOpen && (
            <EmiQuickCalc
              disabled={blocked}
              onClose={() => setCalcOpen(false)}
              onAsk={(p) => {
                setCalcOpen(false)
                onSend(p)
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cooldown > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-2 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 px-3 py-2 text-amber-900 dark:text-amber-100">
                  <Clock className="size-4 shrink-0" />
                  <span>
                    Too many requests. You can send again in <b className="tabular-nums">{cooldown}s</b>.
                  </span>
                </div>
                <motion.div
                  className="h-0.5 bg-amber-400"
                  initial={false}
                  animate={{ width: `${(cooldown / IP_COOLDOWN_SECONDS) * 100}%` }}
                  transition={{ ease: 'linear', duration: 1 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={cn(
            'rounded-2xl border bg-white shadow-lg shadow-slate-900/5 transition focus-within:shadow-xl dark:bg-slate-900 dark:shadow-black/20',
            tooLong
              ? 'border-red-400 ring-2 ring-red-400/20'
              : 'border-slate-200 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-slate-700',
          )}
        >
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder={cooldown > 0 ? 'Please wait a moment…' : 'Ask about cars, budgets or EMI…'}
            aria-label="Message"
            className="block max-h-[200px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] outline-none placeholder:text-slate-400"
          />

          <div className="flex items-center gap-2 px-2.5 pb-2.5">
            <button
              onClick={() => setCalcOpen((o) => !o)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition',
                calcOpen
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
              )}
              aria-expanded={calcOpen}
              aria-label="Open EMI calculator"
            >
              <Calculator className="size-4" />
              <span className="hidden sm:inline">EMI</span>
            </button>

            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {QUICK_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => addChip(c)}
                  className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-brand-400 hover:text-brand-600 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:text-brand-300"
                >
                  + {c}
                </button>
              ))}
            </div>

            <span
              className={cn(
                'hidden shrink-0 text-[11px] tabular-nums transition sm:inline',
                length === 0 && 'opacity-0',
                tooLong ? 'font-semibold text-red-500' : length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-amber-500' : 'text-slate-400',
              )}
            >
              {length}/{MAX_MESSAGE_LENGTH}
            </span>

            {pending ? (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onStop}
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                aria-label="Stop waiting for reply"
                title="Stop"
              >
                <Square className="size-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={canSend ? { scale: 0.9 } : undefined}
                onClick={submit}
                disabled={!canSend}
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-xl transition',
                  canSend
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 hover:bg-brand-500'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                )}
                aria-label="Send message"
              >
                {cooldown > 0 ? <span className="text-[11px] font-semibold tabular-nums">{cooldown}</span> : <ArrowUp className="size-[18px]" />}
              </motion.button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-slate-400">
          {tooLong ? (
            <span className="text-red-500">Message is too long. Keep it under {MAX_MESSAGE_LENGTH} characters.</span>
          ) : (
            <>
              <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift + Enter</kbd> for a new line · AI
              replies can be inaccurate, so verify prices with the dealer.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
