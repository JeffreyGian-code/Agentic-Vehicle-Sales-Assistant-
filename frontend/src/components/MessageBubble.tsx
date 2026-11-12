import { motion } from 'motion/react'
import { AlertTriangle, Bot, Check, Clock, Copy, PlugZap, RotateCcw, Sparkles, Square, User, WifiOff } from 'lucide-react'
import { memo, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatErrorKind } from '../api/types'
import type { Message } from '../lib/types'
import { cn, formatTime } from '../lib/utils'

const mdComponents: Components = {
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="md text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {text}
      </ReactMarkdown>
    </div>
  )
})

interface Props {
  message: Message
  onRetry?: (id: string) => void
  onNewChat?: (carryText?: string) => void
  canRetry: boolean
  cooldown: number
}

export function MessageBubble({ message, onRetry, onNewChat, canRetry, cooldown }: Props) {
  if (message.role === 'user') return <UserBubble message={message} />
  if (message.role === 'error') {
    return <ErrorBubble message={message} onRetry={onRetry} onNewChat={onNewChat} canRetry={canRetry} cooldown={cooldown} />
  }
  return <AssistantBubble message={message} />
}

function UserBubble({ message }: { message: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group flex justify-end gap-3"
    >
      <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%]">
        <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-2.5 text-[15px] whitespace-pre-wrap text-white shadow-md shadow-brand-600/20">
          {message.content}
        </div>
        <span className="mt-1 text-[11px] text-slate-400 opacity-0 transition group-hover:opacity-100">
          {formatTime(message.createdAt)}
        </span>
      </div>
      <div className="mt-0.5 hidden size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600 sm:grid dark:bg-slate-800 dark:text-slate-300">
        <User className="size-4" />
      </div>
    </motion.div>
  )
}

function AssistantBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="group flex gap-3"
    >
      <Avatar />
      <div className="min-w-0 flex-1">
        <div className="inline-block max-w-full rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Markdown text={message.content} />
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
          <span>{formatTime(message.createdAt)}</span>
          <button
            onClick={copy}
            className="ml-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 max-md:opacity-100 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Copy reply"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function Avatar({ pulse = false }: { pulse?: boolean }) {
  return (
    <div
      className={cn(
        'relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-md shadow-brand-500/30',
        pulse && 'animate-pulse',
      )}
    >
      <Bot className="size-4" />
    </div>
  )
}

const ERROR_META: Record<ChatErrorKind | 'cancelled', { title: string; icon: typeof AlertTriangle; tone: 'red' | 'amber' }> = {
  validation: { title: 'Message not accepted', icon: AlertTriangle, tone: 'amber' },
  'ip-rate-limit': { title: 'Slow down a little', icon: Clock, tone: 'amber' },
  'conversation-limit': { title: 'Conversation limit reached', icon: Sparkles, tone: 'amber' },
  server: { title: 'Something went wrong', icon: AlertTriangle, tone: 'red' },
  network: { title: "Can't reach the server", icon: WifiOff, tone: 'red' },
  timeout: { title: 'Request timed out', icon: PlugZap, tone: 'red' },
  cancelled: { title: 'Stopped', icon: Square, tone: 'amber' },
}

function ErrorBubble({ message, onRetry, onNewChat, canRetry, cooldown }: Props) {
  const kind = message.errorKind ?? 'server'
  const meta = ERROR_META[kind]
  const Icon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: [0, -4, 4, -2, 0] }}
      transition={{ duration: 0.4 }}
      className="flex gap-3"
      role="alert"
    >
      <div
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
          meta.tone === 'red'
            ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        )}
      >
        <Icon className="size-4" />
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl rounded-tl-md border px-4 py-3 text-sm',
          meta.tone === 'red'
            ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
            : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
        )}
      >
        <p className="font-semibold">{meta.title}</p>
        <p className="mt-0.5 opacity-90">{message.content}</p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {kind === 'conversation-limit' ? (
            <button
              onClick={() => onNewChat?.(message.retryText)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-500 active:scale-95"
            >
              <Sparkles className="size-3.5" /> Ask this again in a new chat
            </button>
          ) : kind !== 'validation' && message.retryText ? (
            <button
              disabled={!canRetry || cooldown > 0}
              onClick={() => onRetry?.(message.id)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-white/10 dark:hover:bg-slate-700"
            >
              <RotateCcw className="size-3.5" />
              {cooldown > 0 ? `Retry in ${cooldown}s` : 'Retry'}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
