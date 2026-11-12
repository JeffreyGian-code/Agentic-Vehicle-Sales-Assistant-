import type { ChatErrorKind } from '../api/types'

export type MessageRole = 'user' | 'assistant' | 'error'

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  /** Only for role === 'error' */
  errorKind?: ChatErrorKind | 'cancelled'
  /** Only for role === 'error': the user text that failed, so it can be retried */
  retryText?: string
}

export interface Conversation {
  id: string
  title: string
  /** Backend session id; null until the first successful reply */
  sessionId: string | null
  messages: Message[]
  createdAt: number
  updatedAt: number
  /** True once the backend reported the per-conversation limit */
  ended: boolean
  /** Number of successful assistant replies (used for the "replies left" hint) */
  replies: number
}
