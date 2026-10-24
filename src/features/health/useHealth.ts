import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { HEALTH_POLL_MS } from '../../config'

export type HealthStatus = 'checking' | 'up' | 'degraded' | 'down'

export interface HealthState {
  status: HealthStatus
  components: { name: string; status: string }[]
  error?: string
  checkedAt?: number
}

/** Polls /actuator/health. One poller per mounted consumer; mount it once (top bar). */
export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'checking', components: [] })

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const health = await api.health()
        if (cancelled) return
        const components = Object.entries(health.components ?? {}).map(([name, c]) => ({ name, status: c.status }))
        setState({
          status: health.status === 'UP' ? 'up' : 'degraded',
          components,
          checkedAt: Date.now(),
        })
      } catch (e) {
        if (cancelled) return
        setState({ status: 'down', components: [], error: e instanceof Error ? e.message : String(e), checkedAt: Date.now() })
      }
    }
    check()
    const timer = setInterval(check, HEALTH_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return state
}
