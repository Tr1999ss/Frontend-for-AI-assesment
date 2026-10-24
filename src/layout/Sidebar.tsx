import { Lock, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react'
import { groupBySection, ROUTES, type RouteDefinition } from '../app/routes'
import { useAuth } from '../auth/AuthProvider'
import { APP_NAME, BACKEND_URL } from '../config'
import { cx } from '../lib/cx'

interface SidebarProps {
  current: RouteDefinition
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenSettings: () => void
  onNavigate: () => void
}

export function Sidebar({ current, collapsed, onToggleCollapsed, onOpenSettings, onNavigate }: SidebarProps) {
  const { status, hasRole } = useAuth()
  const canOpen = (route: RouteDefinition) =>
    route.access === 'public' ||
    status === 'loading' ||
    (status === 'authenticated' && (route.access === 'authenticated' || hasRole(route.access)))

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden>
          <span />
        </span>
        <span className="sidebar-reveal">
          <span className="brand-name">{APP_NAME}</span>
          <span className="brand-meta mono">{BACKEND_URL.replace(/^https?:\/\//, '')}</span>
        </span>
      </div>

      <nav className="sidebar-nav">
        {groupBySection(ROUTES).map(([section, routes]) => (
          <div key={section} className="sidebar-group">
            <div className="sidebar-section sidebar-reveal">{section}</div>
            {routes.map((route) => {
              const Icon = route.icon
              const active = route.id === current.id
              return (
                <a
                  key={route.id}
                  href={`#${route.id}`}
                  className={cx('sidebar-link', active && 'is-active')}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? route.label : undefined}
                  onClick={onNavigate}
                >
                  <Icon className="sidebar-link-icon" />
                  <span className="sidebar-reveal grow">{route.label}</span>
                  {!canOpen(route) && <Lock className="sidebar-lock sidebar-reveal" aria-label="Requires sign-in or a role" />}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="sidebar-link" onClick={onOpenSettings} title={collapsed ? 'Settings' : undefined}>
          <Settings className="sidebar-link-icon" />
          <span className="sidebar-reveal grow">Settings</span>
          <kbd className="sidebar-reveal">Ctrl ,</kbd>
        </button>
        <button
          type="button"
          className="sidebar-link sidebar-collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : undefined}
        >
          {collapsed ? <PanelLeftOpen className="sidebar-link-icon" /> : <PanelLeftClose className="sidebar-link-icon" />}
          <span className="sidebar-reveal">Collapse</span>
        </button>
      </div>
    </aside>
  )
}
