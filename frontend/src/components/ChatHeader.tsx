import { Menu, Monitor, Moon, RefreshCw, Sun } from 'lucide-react'
import { USE_MOCK } from '../api/client'
import type { HealthStatus } from '../hooks/useHealth'
import type { Theme } from '../hooks/useTheme'
import type { Conversation } from '../lib/types'
import { cn } from '../lib/utils'

interface Props {
  conversation: Conversation | null
  health: HealthStatus
  onRefreshHealth: () => void
  theme: Theme
  onCycleTheme: () => void
  onOpenSidebar: () => void
}

export function ChatHeader({ conversation, health, onRefreshHealth, theme, onCycleTheme, onOpenSidebar }: Props) {
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/70 px-3 backdrop-blur sm:px-5 dark:border-slate-800 dark:bg-slate-900/50">
      <button
        onClick={onOpenSidebar}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Open execution dashboard"
      >
        <Menu className="size-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold sm:text-base">{conversation?.title ?? 'Your vehicle assistant'}</h1>
        <p className="text-[11px] text-slate-500">One conversation ? Live execution dashboard</p>
      </div>

      {USE_MOCK && (
        <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 sm:inline dark:bg-amber-500/15 dark:text-amber-300">
          MOCK API
        </span>
      )}

      <button
        onClick={onRefreshHealth}
        disabled={health === 'checking'}
        className="group flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        title="Check API, database and AI provider status"
      >
        <span className="relative flex size-2">
          {health === 'online' && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
          <span
            className={cn(
              'relative inline-flex size-2 rounded-full',
              health === 'online' && 'bg-emerald-500',
              health === 'offline' && 'bg-red-500',
              (health === 'checking' || health === 'degraded') && 'bg-amber-400',
              health === 'unchecked' && 'bg-slate-400',
            )}
          />
        </span>
        <span className="hidden sm:inline">
          {health === 'online' ? 'Checks passed' : health === 'offline' ? 'Check failed' : health === 'degraded' ? 'Service issue' : health === 'checking' ? 'Checking' : 'Check services'}
        </span>
        <RefreshCw className={cn('size-3 text-slate-400 transition group-hover:rotate-180', health === 'checking' && 'animate-spin')} />
      </button>

      <button
        onClick={onCycleTheme}
        className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label={`Theme: ${theme}. Click to change`}
        title={`Theme: ${theme}`}
      >
        <ThemeIcon className="size-[18px]" />
      </button>
    </header>
  )
}
