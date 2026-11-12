import { motion } from 'motion/react'
import { ArrowUpRight, Calculator, Car, CarFront, Fuel, Scale, Sparkles } from 'lucide-react'

const STARTERS = [
  { icon: Car, title: 'Find Honda sedans', prompt: 'Find Honda sedans under 10 lakh', hint: 'Under ₹10 lakh' },
  { icon: CarFront, title: 'Explore SUVs', prompt: 'Show me SUVs under 20 lakh', hint: 'Under ₹20 lakh' },
  { icon: Calculator, title: 'Calculate EMI', prompt: 'What is the EMI on 12 lakh at 9% for 5 years?', hint: '₹12 lakh · 9% · 5 yrs' },
  { icon: Fuel, title: 'Go electric', prompt: 'Show me electric cars under 25 lakh', hint: 'EVs under ₹25 lakh' },
  { icon: Scale, title: 'Automatic hatchbacks', prompt: 'Find automatic hatchbacks under 8 lakh', hint: 'Easy city driving' },
  { icon: Sparkles, title: 'Family car', prompt: 'Suggest a 7-seater for a family under 18 lakh', hint: '7 seats, ₹18 lakh' },
]

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 rounded-3xl bg-brand-500 opacity-40 blur-2xl" />
        <div className="relative grid size-16 animate-float place-items-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-xl">
          <Car className="size-8" />
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
      >
        Find your next car,{' '}
        <span className="bg-gradient-to-r from-brand-500 to-cyan-400 bg-clip-text text-transparent">the easy way</span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="mt-2 max-w-md text-center text-sm text-slate-500 dark:text-slate-400"
      >
        Search our inventory by brand, body type or budget, and work out your monthly EMI. Prices are in INR, so
        feel free to say &ldquo;10 lakh&rdquo;.
      </motion.p>

      <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STARTERS.map((s, i) => (
          <motion.button
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + i * 0.05 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(s.prompt)}
            className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-400 hover:shadow-lg hover:shadow-brand-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/60"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-400">
              <s.icon className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{s.hint}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-500" />
          </motion.button>
        ))}
      </div>
    </div>
  )
}
