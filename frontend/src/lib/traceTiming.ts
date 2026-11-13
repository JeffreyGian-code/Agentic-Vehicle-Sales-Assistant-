import type { TraceRun } from './types'

/** Tool calls are paired by run id, so overlapping tools keep independent clocks. */
export function stepTiming(run: TraceRun, index: number, now: number) {
  const step = run.steps[index]
  const terminalTool = step.phase === 'tool_finished' || step.phase === 'tool_failed'
  if (terminalTool && step.duration_ms != null) {
    return { duration: step.duration_ms, running: false }
  }
  if (step.phase === 'tool_started') {
    const end = run.steps.slice(index + 1).find((candidate) =>
      !!step.run_id && candidate.run_id === step.run_id &&
      (candidate.phase === 'tool_finished' || candidate.phase === 'tool_failed'),
    )
    return {
      duration: end?.duration_ms ?? Math.max(0, (end?.timestamp ?? run.finishedAt ?? now) - step.timestamp),
      running: !end && run.status === 'running',
    }
  }
  if (terminalTool) {
    const start = run.steps.slice(0, index).find((candidate) =>
      !!step.run_id && candidate.run_id === step.run_id && candidate.phase === 'tool_started',
    )
    return { duration: start ? Math.max(0, step.timestamp - start.timestamp) : null, running: false }
  }
  // A processing/writing phase ends when the next model phase or tool call starts.
  const next = run.steps.slice(index + 1).find((candidate) =>
    ['processing', 'writing', 'tool_started'].includes(candidate.phase),
  )
  return {
    duration: Math.max(0, (next?.timestamp ?? run.finishedAt ?? now) - step.timestamp),
    running: !next && run.status === 'running',
  }
}

export function formatDuration(milliseconds: number) {
  return milliseconds < 1000 ? `${Math.round(milliseconds)} ms` : `${(milliseconds / 1000).toFixed(2)} s`
}
