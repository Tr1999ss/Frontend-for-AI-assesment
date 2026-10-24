import { LogIn, LogOut } from 'lucide-react'
import { Badge, Button, Popover, Spinner } from '../ui'
import { useAuth } from './AuthProvider'
import { ROLE_LABELS, ROLES, type Role } from './config'
import './auth.css'

export function UserMenu() {
  const { status, user, login, logout } = useAuth()

  if (status === 'loading') return <Spinner size={16} />
  if (!user) {
    return (
      <Button variant="soft" size="sm" icon={<LogIn />} onClick={login}>
        Sign in
      </Button>
    )
  }

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const appRoles = ROLES.filter((r) => user.roles.includes(r))
  const topRole: Role | undefined = appRoles[appRoles.length - 1]

  return (
    <Popover
      trigger={(props) => (
        <button type="button" className="user-trigger" aria-label="Account" {...props}>
          <span className="avatar">{initials}</span>
          <span className="user-trigger-name">{user.name}</span>
        </button>
      )}
    >
      <div className="user-panel">
        <div className="user-panel-head">
          <span className="avatar avatar-lg">{initials}</span>
          <div className="grow">
            <div className="user-panel-name">{user.name}</div>
            <div className="xsmall muted truncate">{user.email ?? user.username}</div>
          </div>
        </div>
        <div className="cluster">
          {topRole ? <Badge tone="accent">{ROLE_LABELS[topRole]}</Badge> : <Badge>No knowledge-base role</Badge>}
          <span className="xsmall muted mono">{user.username}</span>
        </div>
        <Button icon={<LogOut />} onClick={logout} block>
          Sign out
        </Button>
      </div>
    </Popover>
  )
}
