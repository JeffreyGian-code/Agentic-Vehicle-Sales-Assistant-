import { useCallback, useEffect, useState } from 'react'
import { checkHealth } from '../api/client'

export type HealthStatus = 'checking' | 'online' | 'offline'

const POLL_MS = 30_000

export function useHealth() {
  const [status, setStatus] = useState<HealthStatus>('checking')

  const refresh = useCallback(async () => {
    setStatus((s) => (s === 'online' ? s : 'checking'))
    const ok = await checkHealth()
    setStatus(ok ? 'online' : 'offline')
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const ok = await checkHealth()
      if (!cancelled) setStatus(ok ? 'online' : 'offline')
    }
    run()
    const id = setInterval(run, POLL_MS)
    const onFocus = () => run()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return { status, refresh }
}
