import { useEffect, useState } from 'react'
import { DEFAULT_ROUTE, ROUTES, type RouteDefinition } from './routes'

function resolve(): RouteDefinition {
  const id = window.location.hash.slice(1).split('?')[0]
  return ROUTES.find((r) => r.id === id) ?? DEFAULT_ROUTE
}

/** Hash routing: survives refreshes, needs no server rewrites. */
export function useHashRoute(): RouteDefinition {
  const [route, setRoute] = useState(resolve)
  useEffect(() => {
    const onChange = () => setRoute(resolve())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(id: string) {
  window.location.hash = id
}
