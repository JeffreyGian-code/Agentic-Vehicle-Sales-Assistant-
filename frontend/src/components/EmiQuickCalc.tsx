import { motion } from 'motion/react'
import { Calculator, Send, X } from 'lucide-react'
import { useState } from 'react'
import { calcEmi, formatINR, formatLakh } from '../lib/utils'

interface Props {
  onAsk: (prompt: string) => void
  onClose: () => void
  disabled: boolean
}

export function EmiQuickCalc({ onAsk, onClose, disabled }: Props) {
  const [lakh, setLakh] = useState(10)
  const [rate, setRate] = useState(9)
  const [years, setYears] = useState(5)

  const principal = lakh * 100_000
  const { emi, interest, total } = calcEmi(principal, rate, years)
  const interestShare = Math.round((interest / total) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="absolute right-0 bottom-full left-0 z-20 mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:left-auto sm:w-96 dark:border-slate-700 dark:bg-slate-900"
      role="dialog"
      aria-label="EMI quick calculator"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="size-4 text-brand-500" /> EMI quick calculator
        </p>
        <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <Slider label="Loan amount" value={`₹${formatLakh(principal)}`} min={1} max={50} step={0.5} current={lakh} onChange={setLakh} />
      <Slider label="Interest rate" value={`${rate.toFixed(1)}%`} min={6} max={18} step={0.1} current={rate} onChange={setRate} />
      <Slider label="Tenure" value={`${years} ${years === 1 ? 'year' : 'years'}`} min={1} max={7} step={1} current={years} onChange={setYears} />

      <div className="mt-3 rounded-xl bg-gradient-to-br from-brand-50 to-cyan-50 p-3 dark:from-brand-500/10 dark:to-cyan-500/5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">Estimated EMI</p>
            <motion.p key={Math.round(emi)} initial={{ opacity: 0.4, y: -2 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold tabular-nums">
              {formatINR(emi)}
              <span className="text-sm font-medium text-slate-500">/mo</span>
            </motion.p>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            <p>Interest {formatINR(interest)}</p>
            <p>Total {formatINR(total)}</p>
          </div>
        </div>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800" title={`${interestShare}% of the total is interest`}>
          <motion.div className="bg-brand-500" animate={{ width: `${100 - interestShare}%` }} />
          <motion.div className="bg-amber-400" animate={{ width: `${interestShare}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>Principal</span>
          <span>Interest {interestShare}%</span>
        </div>
      </div>

      <button
        disabled={disabled}
        onClick={() => onAsk(`What is the EMI on ${+lakh.toFixed(2)} lakh at ${+rate.toFixed(1)}% for ${years} years?`)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2 text-sm font-medium text-white transition hover:bg-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="size-4" /> Ask the assistant for details
      </button>
    </motion.div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
}: {
  label: string
  value: string
  min: number
  max: number
  step: number
  current: number
  onChange: (v: number) => void
}) {
  const pct = ((current - min) / (max - min)) * 100
  return (
    <label className="mb-3 block">
      <span className="mb-1 flex justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-brand-600"
        style={{
          background: `linear-gradient(to right, var(--color-brand-500) ${pct}%, rgb(148 163 184 / 0.3) ${pct}%)`,
        }}
      />
    </label>
  )
}
