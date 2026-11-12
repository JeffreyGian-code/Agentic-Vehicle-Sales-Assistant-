export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDay(ts: number) {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatINR(value: number) {
  return '₹' + Math.round(value).toLocaleString('en-IN')
}

/** Compact Indian format: 12,00,000 -> "12 lakh", 1,50,00,000 -> "1.5 crore" */
export function formatLakh(value: number) {
  if (value >= 1_00_00_000) return `${+(value / 1_00_00_000).toFixed(2)} crore`
  return `${+(value / 1_00_000).toFixed(2)} lakh`
}

/** Standard reducing-balance EMI. */
export function calcEmi(principal: number, annualRatePct: number, years: number) {
  const n = Math.round(years * 12)
  const r = annualRatePct / 12 / 100
  const emi = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1)
  const total = emi * n
  return { emi, total, interest: total - principal, months: n }
}

export function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 42 ? clean.slice(0, 40).trimEnd() + '…' : clean || 'New chat'
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: ignore */
  }
}
