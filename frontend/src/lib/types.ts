import type { ChatErrorKind, ChatProgress } from '../api/types'

export interface TraceRun {
  id: string
  input: string
  startedAt: number
  finishedAt?: number
  status: 'running' | 'completed' | 'error' | 'cancelled'
  steps: (ChatProgress & { id: string; timestamp: number })[]
  reply?: string
  error?: string
}

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
  resetContext?: boolean
  traces?: TraceRun[]
  id: string
  title: string
  /** Backend session id; null until the first successful reply */
  sessionId: string | null
  messages: Message[]
  createdAt: number
  updatedAt: number
  /** Legacy field retained for saved transcripts. New requests do not end a conversation. */
  ended: boolean
  /** Number of successful assistant replies. */
  replies: number
}
