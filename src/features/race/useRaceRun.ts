import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import type { RaceReport, RaceRequest } from '../../api/types'
import { deadline } from '../../lib/abort'

export type RaceStop = 'cancelled' | 'timeout'

/**
 * Runs one race at a time. Cancel, a timeout or leaving the page only stop the browser waiting:
 * the server finishes the race and saves it, so it can be loaded later with GET /api/admin/race/latest.
 */
export function useRaceRun(onFinished: (report: RaceReport) => void) {
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [stopped, setStopped] = useState<RaceStop | null>(null)
  const controller = useRef<AbortController | null>(null)
  const onFinishedRef = useRef(onFinished)
  useEffect(() => {
    onFinishedRef.current = onFinished
  })
  useEffect(() => () => controller.current?.abort(), [])

  const start = useCallback(async (body: RaceRequest, timeoutMs: number) => {
    if (controller.current) return // a race is already in flight
    const cancel = new AbortController()
    controller.current = cancel
    const limit = deadline(timeoutMs, cancel.signal)
    setRunning(true)
    setStartedAt(Date.now())
    setError(null)
    setStopped(null)
    try {
      onFinishedRef.current(await api.admin.race(body, limit.signal))
    } catch (e) {
      if (limit.signal.aborted) setStopped(limit.timedOut() ? 'timeout' : 'cancelled')
      else setError(e)
    } finally {
      limit.dispose()
      controller.current = null
      setRunning(false)
      setStartedAt(null)
    }
  }, [])

  const cancel = useCallback(() => controller.current?.abort(), [])
  const clear = useCallback(() => {
    setError(null)
    setStopped(null)
  }, [])

  return { start, cancel, clear, running, startedAt, error, stopped }
}
