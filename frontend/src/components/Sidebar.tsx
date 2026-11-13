import { AnimatePresence, motion } from 'motion/react'
import { Activity, Car, CheckCircle2, ChevronRight, CircleDashed, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PendingRequest } from '../hooks/useChat'
import type { Conversation, TraceRun } from '../lib/types'
import { cn, formatTime } from '../lib/utils'
import { Markdown } from './MessageBubble'
import { formatDuration, stepTiming } from '../lib/traceTiming'

interface Props {
  conversation: Conversation | null
  pending: PendingRequest | null
  open: boolean
  onClose: () => void
}

export function Sidebar(props: Props) {
  return (
    <>
      <aside className="hidden w-96 shrink-0 border-r border-slate-200 bg-white/70 backdrop-blur md:flex md:flex-col dark:border-slate-800 dark:bg-slate-900/60">
        <Dashboard {...props} />
      </aside>
      <AnimatePresence>
        {props.open && (
          <motion.div className="fixed inset-0 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={props.onClose} />
            <motion.aside className="absolute inset-y-0 left-0 flex w-[92%] max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}>
              <button onClick={props.onClose} className="absolute top-4 right-3 z-10 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close execution dashboard"><X className="size-5" /></button>
              <Dashboard {...props} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Dashboard({ conversation, pending }: Props) {
  const runs = conversation?.traces ?? []
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white"><Car className="size-5" /></div>
        <div><p className="text-sm font-semibold">AutoAssist</p><p className="text-xs text-slate-500">Vehicle Sales Assistant</p></div>
      </div>
      <div className="px-4 pt-5 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-brand-500" /> Execution dashboard</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Follow each query from input to final response.</p>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span>{runs.length} {runs.length === 1 ? 'run' : 'runs'}</span><span role="status" className={pending ? 'text-brand-600 dark:text-brand-300' : ''}>{pending ? 'Running' : 'Ready'}</span></div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4" aria-label="Execution runs">
        {runs.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700"><Activity className="mx-auto mb-3 size-6 text-slate-400" /><p className="text-sm font-medium">Your system activity appears here</p><p className="mt-2 text-xs leading-relaxed text-slate-500">Send a message to see extracted data, tool calls, results, and the assistant&apos;s response.</p>{!!conversation?.messages.length && <p className="mt-2 text-xs text-slate-500">Execution details are available for new messages.</p>}</div>}
        {[...runs].reverse().map((run, index) => <Run key={run.id} run={run} number={runs.length - index} reply={run.status === 'running' ? pending?.reply : undefined} />)}
      </div>
    </div>
  )
}

function Payload({ value }: { value: unknown }) {
  return <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-100 p-2.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words dark:bg-slate-950/60">{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>
}

function Run({ run, number, reply }: { run: TraceRun; number: number; reply?: string }) {
  const running = run.status === 'running'
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [running])
  return (
    <details open className="group/run rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-xs">
        <ChevronRight className="size-3.5 shrink-0 transition group-open/run:rotate-90" />
        {running ? <CircleDashed className="size-4 shrink-0 animate-spin text-brand-500" /> : <CheckCircle2 className={cn('size-4 shrink-0', run.status === 'completed' ? 'text-emerald-500' : 'text-amber-500')} />}
        <span className="min-w-0 flex-1"><span className="font-semibold">Run {number}</span><span className="ml-2 text-slate-500">{formatTime(run.startedAt)}</span></span>
        <span className="text-[10px] text-slate-500">{running ? 'Running' : run.status === 'completed' ? `${((run.finishedAt! - run.startedAt) / 1000).toFixed(1)}s` : run.status}</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
        <div><p className="text-[11px] font-semibold text-brand-600 dark:text-brand-300">User input:</p><p className="mt-1 text-xs whitespace-pre-wrap break-words">{run.input}</p></div>
        <ol className="ml-1 space-y-3 border-l border-slate-200 pl-3 dark:border-slate-700">
          {run.steps.map((step, index) => {
            const timing = stepTiming(run, index, now)
            return (
            <li key={step.id} className="text-xs">
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span>{formatTime(step.timestamp)}</span>
                <span className="tabular-nums" title={step.tool ? 'Tool execution time' : 'Time spent in this phase'}>
                  {timing.duration == null ? 'Timing unavailable' : `${formatDuration(timing.duration)}${timing.running ? ' elapsed' : ''}`}
                </span>
              </div>
              <p className={cn('mt-0.5 font-medium', step.phase === 'tool_failed' && 'text-amber-600')}>{step.tool ? `${step.phase === 'tool_started' ? 'Tool called' : step.phase === 'tool_failed' ? 'Tool failed' : 'Tool result'}: ${step.tool}` : step.label}</p>
              {step.phase === 'tool_started' && <details className="mt-1"><summary className="cursor-pointer text-slate-500">Extracted data / tool input:</summary>{step.input == null ? <p className="mt-1 text-slate-500">No arguments provided.</p> : <Payload value={step.input} />}</details>}
              {(step.phase === 'tool_finished' || step.phase === 'tool_failed') && <details className="mt-1"><summary className="cursor-pointer text-slate-500">View tool result</summary>{step.output == null ? <p className="mt-1 text-slate-500">No result returned.</p> : <Payload value={step.output} />}</details>}
            </li>
          )})}
        </ol>
        {(run.reply || reply) && <details open><summary className="cursor-pointer text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{running ? 'Generating response:' : 'Final LLM response:'}</summary><div className="mt-2 max-h-96 overflow-auto break-words"><Markdown text={run.reply ?? reply ?? ''} /></div></details>}
        {run.error && <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{run.error}</p>}
      </div>
    </details>
  )
}
