import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const source = ts.transpileModule(readFileSync(new URL('../src/lib/traceTiming.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { stepTiming, formatDuration } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

const step = (phase, timestamp, run_id, duration_ms) => ({ phase, timestamp, run_id, duration_ms })

test('pairs overlapping tools by run id and prefers server execution time', () => {
  const run = { status: 'completed', finishedAt: 9000, steps: [
    step('processing', 1000), step('tool_started', 2000, 'a'), step('tool_started', 2100, 'b'),
    step('tool_finished', 3000, 'b', 850), step('tool_finished', 4500, 'a', 2400),
    step('processing', 4600), step('writing', 6000),
  ] }
  assert.deepEqual(stepTiming(run, 0, 10000), { duration: 1000, running: false })
  assert.equal(stepTiming(run, 1, 10000).duration, 2400)
  assert.equal(stepTiming(run, 2, 10000).duration, 850)
  assert.equal(stepTiming(run, 3, 10000).duration, 850)
  assert.equal(stepTiming(run, 5, 10000).duration, 1400)
  assert.equal(stepTiming(run, 6, 10000).duration, 3000)
})

test('live timers stop at cancellation and support saved traces without server timing', () => {
  const run = { status: 'running', steps: [step('tool_started', 1000, 'a')] }
  assert.deepEqual(stepTiming(run, 0, 3500), { duration: 2500, running: true })
  run.status = 'cancelled'
  run.finishedAt = 4000
  assert.deepEqual(stepTiming(run, 0, 10000), { duration: 3000, running: false })
  run.steps.push(step('tool_failed', 3900, 'a'))
  assert.equal(stepTiming(run, 0, 10000).duration, 2900)
  assert.equal(stepTiming(run, 1, 10000).duration, 2900)
})

test('formats subsecond and second durations', () => {
  assert.equal(formatDuration(12.6), '13 ms')
  assert.equal(formatDuration(1250), '1.25 s')
})
