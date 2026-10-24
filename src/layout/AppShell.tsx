import { useEffect, useState, type ReactNode } from 'react'
import type { RouteDefinition } from '../app/routes'
import { cx } from '../lib/cx'
import { useHotkey, usePersistentState } from '../lib/hooks'
import { SettingsSheet } from './SettingsSheet'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import './shell.css'

export function AppShell({ route, children }: { route: RouteDefinition; children: ReactNode }) {
  const [collapsed, setCollapsed] = usePersistentState('sidebar.collapsed', false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useHotkey('mod+,', () => setSettingsOpen(true))
  useHotkey('mod+b', () => setCollapsed((c) => !c))
  useEffect(() => setMobileOpen(false), [route.id])

  return (
    <div className={cx('shell', collapsed && 'is-collapsed', mobileOpen && 'is-mobile-open')}>
      <Sidebar
        current={route}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onOpenSettings={() => setSettingsOpen(true)}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className="shell-scrim" onClick={() => setMobileOpen(false)} aria-hidden />
      <div className="shell-main">
        <Topbar route={route} onOpenMenu={() => setMobileOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
        <main className={cx('shell-content', route.layout === 'full' && 'is-full')} id="main">
          {children}
        </main>
      </div>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
