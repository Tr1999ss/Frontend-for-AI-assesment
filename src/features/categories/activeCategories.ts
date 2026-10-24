import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { Category } from '../../api/types'
import { useResource } from '../../lib/hooks'

// One shared fetch of the public category list for every picker on screen.
// Admin edits call invalidateActiveCategories() so pickers refresh.

let cache: Promise<Category[]> | null = null
const listeners = new Set<() => void>()

function load(): Promise<Category[]> {
  cache ??= api.activeCategories().catch((e: unknown) => {
    cache = null
    throw e
  })
  return cache
}

export function invalidateActiveCategories() {
  cache = null
  listeners.forEach((notify) => notify())
}

export function useActiveCategories() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const notify = () => setVersion((v) => v + 1)
    listeners.add(notify)
    return () => {
      listeners.delete(notify)
    }
  }, [])
  return useResource(load, [version])
}
