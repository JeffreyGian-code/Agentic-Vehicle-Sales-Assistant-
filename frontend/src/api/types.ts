export interface ChatRequest {
  message: string // 1..2000 chars
  session_id?: string | null
}

export interface ChatResponse {
  reply: string
  session_id: string
}

export interface ValidationIssue {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface ApiError {
  // string for 429/500, array of validation errors for 422
  detail: string | ValidationIssue[]
}

export type ChatErrorKind =
  | 'validation'
  | 'ip-rate-limit'
  | 'conversation-limit'
  | 'server'
  | 'network'
  | 'timeout'

export class ChatError extends Error {
  readonly kind: ChatErrorKind
  readonly status?: number

  constructor(kind: ChatErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'ChatError'
    this.kind = kind
    this.status = status
  }
}

export const MAX_MESSAGE_LENGTH = 2000
