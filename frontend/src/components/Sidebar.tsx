import { AnimatePresence, motion } from 'motion/react'
import { Car, Check, MessageSquare, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Conversation } from '../lib/types'
import { cn, formatDay } from '../lib/utils'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  pendingId: string | null
  open: boolean
  onClose: () => void
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onClearAll: () => void
}

export function Sidebar(props: Props) {
  const { open, onClose } = props
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/70 backdrop-blur md:flex md:flex-col dark:border-slate-800 dark:bg-slate-900/60">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-white shadow-2xl dark:bg-slate-900"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close sidebar"
              >
                <X className="size-5" />
              </button>
              <SidebarContent {...props} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function SidebarContent({
  conversations,
  activeId,
  pendingId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onClearAll,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q)),
      )
    const map = new Map<string, Conversation[]>()
    for (const c of filtered) {
      const key = formatDay(c.updatedAt)
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return [...map.entries()]
  }, [conversations, query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-lg shadow-brand-500/30">
          <Car className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">AutoAssist</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Vehicle Sales Assistant</p>
        </div>
      </div>

      <div className="space-y-2 px-3">
        <button
          onClick={() => {
            onNew()
            onClose()
          }}
          className="group flex w-full items-center justify-between rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-medium text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-500 active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <Plus className="size-4 transition group-hover:rotate-90" /> New chat
          </span>
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-sans text-[10px] tracking-wide">Ctrl K</kbd>
        </button>

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/60">
          <Search className="size-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-slate-400 hover:text-slate-600">
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-3" aria-label="Conversations">
        {groups.length === 0 && (
          <div className="mt-10 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
            <MessageSquare className="mx-auto mb-2 size-6 opacity-50" />
            {query ? 'No chats match your search.' : 'Your conversations will appear here.'}
          </div>
        )}
        {groups.map(([day, items]) => (
          <div key={day} className="mb-3">
            <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{day}</p>
            <ul className="space-y-0.5">
              <AnimatePresence initial={false}>
                {items.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    pending={c.id === pendingId}
                    onSelect={() => {
                      onSelect(c.id)
                      onClose()
                    }}
                    onDelete={() => onDelete(c.id)}
                    onRename={(t) => onRename(c.id, t)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ))}
      </nav>

      {conversations.length > 0 && (
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          {confirmClear ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">Delete all chats?</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    onClearAll()
                    setConfirmClear(false)
                  }}
                  className="rounded-lg bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-500"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg px-2.5 py-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <Trash2 className="size-3.5" /> Clear all conversations
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ConversationItem({
  conversation: c,
  active,
  pending,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: Conversation
  active: boolean
  pending: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(c.title)
  const [confirm, setConfirm] = useState(false)

  const commit = () => {
    onRename(draft)
    setEditing(false)
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'group relative flex items-center rounded-lg text-sm transition',
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70',
      )}
    >
      {active && <motion.span layoutId="active-pill" className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand-500" />}
      {editing ? (
        <form
          className="flex w-full items-center gap-1 px-2 py-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            commit()
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            className="w-full rounded-md border border-brand-500 bg-white px-2 py-1 text-sm outline-none dark:bg-slate-900"
          />
          <button type="submit" className="p-1 text-brand-600" aria-label="Save title">
            <Check className="size-4" />
          </button>
        </form>
      ) : (
        <>
          <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 pl-3 text-left" title={c.title}>
            {pending ? (
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
              </span>
            ) : (
              <MessageSquare className={cn('size-3.5 shrink-0', c.ended ? 'opacity-30' : 'opacity-60')} />
            )}
            <span className={cn('truncate', c.ended && 'opacity-60')}>{c.title}</span>
          </button>
          {confirm ? (
            <div className="flex shrink-0 items-center gap-0.5 pr-1">
              <button onClick={onDelete} className="rounded-md bg-red-600 px-1.5 py-0.5 text-[11px] font-medium text-white" aria-label="Confirm delete">
                Delete
              </button>
              <button onClick={() => setConfirm(false)} className="rounded-md p-1 text-slate-400 hover:text-slate-600" aria-label="Cancel delete">
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center pr-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
              <button
                onClick={() => {
                  setDraft(c.title)
                  setEditing(true)
                }}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Rename chat"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={() => setConfirm(true)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600 dark:hover:bg-slate-700"
                aria-label="Delete chat"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </motion.li>
  )
}
