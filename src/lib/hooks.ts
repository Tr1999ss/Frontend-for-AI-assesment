import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { storage } from './storage'

/** useState that survives reloads (per browser). */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => storage.get(key, initial))
  useEffect(() => {
    storage.set(key, value)
  }, [key, value])
  return [value, setValue] as const
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export interface ResourceState<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  reload: () => void
}

/** Loads data when deps change; keeps the previous data visible while reloading. */
export function useResource<T>(load: () => Promise<T>, deps: DependencyList = []): ResourceState<T> {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: unknown }>({
    data: undefined,
    loading: true,
    error: null,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    load().then(
      (data) => !cancelled && setState({ data, loading: false, error: null }),
      (error: unknown) => !cancelled && setState((s) => ({ ...s, loading: false, error })),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}

/** Wraps an async action with busy/error state. run() resolves to undefined on failure. */
export function useAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const actionRef = useRef(action)
  useEffect(() => {
    actionRef.current = action
  })

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    setBusy(true)
    setError(null)
    try {
      return await actionRef.current(...args)
    } catch (e) {
      setError(e)
      return undefined
    } finally {
      setBusy(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])
  return { run, busy, error, clearError }
}

/** Calls handler when a key combo is pressed anywhere, e.g. useHotkey('mod+,', openSettings). */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })
  useEffect(() => {
    const parts = combo.toLowerCase().split('+')
    const key = parts.pop()
    const wantMod = parts.includes('mod')
    const wantShift = parts.includes('shift')
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key) return
      if (wantMod !== (e.ctrlKey || e.metaKey) || wantShift !== e.shiftKey) return
      e.preventDefault()
      handlerRef.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [combo])
}
