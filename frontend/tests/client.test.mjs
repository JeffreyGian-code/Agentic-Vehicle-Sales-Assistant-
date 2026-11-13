import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

// Run the real TypeScript client with Node's test runner, without a browser or API.
const asModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const types = asModule(compile('../src/api/types.ts'))
const mock = asModule('export const mockHealth = () => {}; export const mockSendMessage = () => {};')
const client = compile('../src/api/client.ts')
  .replaceAll("'./types'", JSON.stringify(types))
  .replaceAll("'./mock'", JSON.stringify(mock))
  .replaceAll('import.meta.env', '({})')
const { sendMessage } = await import(asModule(client))
const frame = (event, payload) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`

function stream(text) {
  const bytes = new TextEncoder().encode(text)
  return new Response(new ReadableStream({
    start(controller) {
      // Split inside every JSON field, event boundary, and UTF-8 character.
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      controller.close()
    },
  }), { headers: { 'Content-Type': 'text/event-stream' } })
}

test('reads fragmented SSE, heartbeats, tool events, Unicode, and final reply', async (t) => {
  const progress = []
  const sessions = []
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.match(url, /\/chat\/stream$/)
    return stream(frame('started', { session_id: 'abc' }) + ': heartbeat\n\n' +
      frame('progress', { phase: 'tool_started', tool: 'calculate_emi', run_id: '1', label: 'Calculating EMI…' }) +
      frame('progress', { phase: 'tool_finished', tool: 'calculate_emi', run_id: '1', label: 'Processing results…' }) +
      frame('completed', { session_id: 'abc', reply: 'EMI ₹2,500' }))
  })
  const result = await sendMessage('EMI?', null, undefined, (p) => progress.push(p), (id) => sessions.push(id))
  assert.deepEqual(result, { session_id: 'abc', reply: 'EMI ₹2,500' })
  assert.deepEqual(sessions, ['abc'])
  assert.deepEqual(progress.map((p) => p.phase), ['tool_started', 'tool_finished'])
  assert.equal(progress[0].label, 'Calculating EMI…')
})

test('maps streamed conversation-limit errors and HTTP rate limits', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => stream(frame('error', {
    status: 429, detail: 'Please start a new conversation.',
  })))
  await assert.rejects(sendMessage('Hi'), (error) => error.kind === 'conversation-limit')
  fetch.mock.mockImplementation(async () => new Response(JSON.stringify({ detail: 'Too many requests.' }), { status: 429 }))
  await assert.rejects(sendMessage('Hi'), (error) => error.kind === 'ip-rate-limit')
})

test('rejects an interrupted stream instead of treating it as a completed reply', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => stream(frame('started', { session_id: 'abc' })))
  await assert.rejects(sendMessage('Hi'), (error) => error.kind === 'network')
})

test('accepts CRLF event boundaries split across network chunks', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => stream(frame('completed', {
    session_id: 'abc', reply: 'Hello',
  }).replaceAll('\n', '\r\n')))
  assert.equal((await sendMessage('Hi')).reply, 'Hello')
})

test('caller cancellation aborts the streaming request', async (t) => {
  const controller = new AbortController()
  t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Response(new ReadableStream({
    start(streamController) {
      signal.addEventListener('abort', () => streamController.error(new DOMException('Aborted', 'AbortError')))
      controller.abort()
    },
  })))
  await assert.rejects(sendMessage('Hi', null, controller.signal), (error) => error.name === 'AbortError')
})
