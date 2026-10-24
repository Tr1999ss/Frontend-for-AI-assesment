import { Menu, Moon, Settings, Sun } from 'lucide-react'
import type { RouteDefinition } from '../app/routes'
import { UserMenu } from '../auth/UserMenu'
import { HealthIndicator } from '../features/health/HealthIndicator'
import { useTheme } from '../theme/ThemeProvider'
import { Button } from '../ui'

interface TopbarProps {
  route: RouteDefinition
  onOpenMenu: () => void
  onOpenSettings: () => void
}

export function Topbar({ route, onOpenMenu, onOpenSettings }: TopbarProps) {
  const { resolvedMode, update } = useTheme()
  const Icon = route.icon
  return (
    <header className="topbar">
      <Button variant="ghost" className="topbar-menu" icon={<Menu />} aria-label="Open navigation" onClick={onOpenMenu} />
      <div className="topbar-crumbs">
        <span className="muted">{route.section}</span>
        <span className="topbar-sep" aria-hidden>
          /
        </span>
        <Icon size={15} className="topbar-crumb-icon" />
        <span className="topbar-current">{route.label}</span>
      </div>
      <div className="topbar-actions">
        <HealthIndicator />
        <Button
          variant="ghost"
          icon={resolvedMode === 'dark' ? <Sun /> : <Moon />}
          aria-label={`Switch to ${resolvedMode === 'dark' ? 'light' : 'dark'} mode`}
          title="Toggle theme"
          onClick={() => update({ mode: resolvedMode === 'dark' ? 'light' : 'dark' })}
        />
        <Button variant="ghost" icon={<Settings />} aria-label="Appearance settings" title="Settings" onClick={onOpenSettings} />
        <span className="topbar-divider" aria-hidden />
        <UserMenu />
      </div>
    </header>
  )
}
