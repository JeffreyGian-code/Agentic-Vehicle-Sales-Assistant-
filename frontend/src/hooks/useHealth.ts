import { useCallback, useRef, useState } from 'react'
import { checkHealth, type ServiceHealth } from '../api/client'

export type HealthStatus = 'unchecked' | 'checking' | 'online' | 'offline' | 'degraded'

export function useHealth() {
  const [status, setStatus] = useState<HealthStatus>('unchecked')
  const [services, setServices] = useState<ServiceHealth | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const running = useRef(false)

  const refresh = useCallback(async () => {
    if (running.current) return
    running.current = true
    setStatus('checking')
    setServices(null)
    try {
      const result = await checkHealth()
      setServices(result)
      setStatus(Object.values(result).every((check) => check.status === 'ok') ? 'online' : 'degraded')
    } catch {
      setStatus('offline')
      setServices({
        api: { status: 'unknown', detail: 'Status check failed or timed out. Try again shortly.' },
        database: { status: 'unknown', detail: 'Could not check through the API.' },
        ai: { status: 'unknown', detail: 'Could not check through the API.' },
      })
    } finally {
      setCheckedAt(new Date().toLocaleTimeString())
      running.current = false
    }
  }, [])

  return { status, services, checkedAt, refresh }
}
