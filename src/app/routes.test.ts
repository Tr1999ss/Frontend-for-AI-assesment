import { describe, expect, it } from 'vitest'
import { grants, type Role } from '../auth/config'
import { canOpen, navRoutes, ROUTES, type RouteViewer } from './routes'

const as = (...roles: string[]): RouteViewer => ({ status: 'authenticated', hasRole: (r: Role) => grants(roles, r) })
const ids = (viewer: RouteViewer) => navRoutes(ROUTES, viewer).map((r) => r.id)

describe('admin-only agent pages', () => {
  it('are listed for kb-admin', () => {
    expect(ids(as('kb-admin'))).toEqual(expect.arrayContaining(['race', 'a2a']))
    expect(canOpen(ROUTES.find((r) => r.id === 'race')!, as('kb-admin'))).toBe(true)
  })

  it.each([
    ['reader', as('kb-reader')],
    ['editor', as('kb-editor')],
    ['anonymous', { status: 'anonymous', hasRole: () => false } as RouteViewer],
    ['signing in', { status: 'loading', hasRole: () => false } as RouteViewer],
  ])('are hidden for %s', (_, viewer) => {
    expect(ids(viewer)).not.toContain('race')
    expect(ids(viewer)).not.toContain('a2a')
  })

  it('leave other locked pages listed (shown with a lock)', () => {
    expect(ids(as('kb-reader'))).toContain('evaluation')
    expect(canOpen(ROUTES.find((r) => r.id === 'evaluation')!, as('kb-reader'))).toBe(false)
  })

  it('are reachable by route id, so RequireRole guards direct links', () => {
    const race = ROUTES.find((r) => r.id === 'race')!
    expect(race.access).toBe('kb-admin')
    expect(ROUTES.find((r) => r.id === 'a2a')!.access).toBe('kb-admin')
  })
})
