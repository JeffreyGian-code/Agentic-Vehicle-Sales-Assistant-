import { mockHealth, mockSendMessage } from './mock'
import { ChatError, type ApiError, type ChatResponse } from './types'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '')
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const REQUEST_TIMEOUT_MS = 60_000
const CONVERSATION_LIMIT_HINT = 'new conversation'

function detailToText(detail: ApiError['detail'] | undefined, fallback: string): string {
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  return detail.map((d) => d.msg).join('; ') || fallback
}

function toChatError(status: number, detail: ApiError['detail'] | undefined): ChatError {
  const text = detailToText(detail, 'Something went wrong while processing your request.')
  if (status === 422) return new ChatError('validation', text, status)
  if (status === 429) {
    return text.toLowerCase().includes(CONVERSATION_LIMIT_HINT)
      ? new ChatError('conversation-limit', text, status)
      : new ChatError('ip-rate-limit', text, status)
  }
  return new ChatError('server', text, status)
}

/**
 * POST /api/chat. Throws ChatError for every failure except a caller-initiated abort,
 * which rethrows the original AbortError.
 */
export async function sendMessage(
  message: string,
  sessionId?: string | null,
  externalSignal?: AbortSignal,
): Promise<ChatResponse> {
  if (USE_MOCK) return mockSendMessage(message, sessionId, externalSignal)

  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort)

  try {
    let res: Response
    try {
      res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), session_id: sessionId ?? null }),
        signal: controller.signal,
      })
    } catch (err) {
      if (externalSignal?.aborted) throw err
      if (timedOut) {
        throw new ChatError('timeout', 'The assistant took too long to respond. Please try again.')
      }
      throw new ChatError('network', "Can't reach the server. Check that the API is running.")
    }

    if (!res.ok) {
      const body: Partial<ApiError> = await res.json().catch(() => ({ detail: res.statusText }))
      throw toChatError(res.status, body.detail)
    }

    return (await res.json()) as ChatResponse
  } finally {
    clearTimeout(timeout)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

/** GET /api/health. Resolves true when the API answers {"status": "ok"}. */
export async function checkHealth(): Promise<boolean> {
  if (USE_MOCK) return mockHealth()
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 5_000)
  try {
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal })
    if (!res.ok) return false
    const body = (await res.json()) as { status?: string }
    return body.status === 'ok'
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}
