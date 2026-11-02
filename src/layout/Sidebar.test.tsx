import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTES } from '../app/routes'
import { grants, type Role } from '../auth/config'
import { render } from '../test/render'
import { Sidebar } from './Sidebar'

const auth = vi.hoisted(() => ({ status: 'authenticated', roles: [] as string[] }))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ status: auth.status, hasRole: (r: Role) => grants(auth.roles, r) }),
}))

const links = (container: HTMLElement) => [...container.querySelectorAll('a.sidebar-link')].map((a) => a.getAttribute('href'))

const renderSidebar = () =>
  render(<Sidebar current={ROUTES[0]} collapsed={false} onToggleCollapsed={() => {}} onOpenSettings={() => {}} onNavigate={() => {}} />)

describe('Sidebar role gating', () => {
  beforeEach(() => {
    auth.status = 'authenticated'
  })

  it('lists the agent pages for admins', async () => {
    auth.roles = ['kb-admin']
    const container = await renderSidebar()
    expect(links(container)).toEqual(expect.arrayContaining(['#race', '#a2a']))
    expect(container.textContent).toContain('Agents')
  })

  it('hides them, and their section, for readers', async () => {
    auth.roles = ['kb-reader']
    const container = await renderSidebar()
    expect(links(container)).not.toContain('#race')
    expect(links(container)).not.toContain('#a2a')
    expect(container.textContent).not.toContain('Agents')
    // other admin pages keep their existing locked entry
    expect(links(container)).toContain('#evaluation')
  })

  it('hides them while signed out', async () => {
    auth.status = 'anonymous'
    auth.roles = []
    const container = await renderSidebar()
    expect(links(container)).not.toContain('#race')
  })
})
