import type { ReactNode } from 'react'
import { LogIn, ShieldAlert } from 'lucide-react'
import { Badge, Button, EmptyState, Spinner } from '../ui'
import { useAuth } from './AuthProvider'
import { ROLE_LABELS, type Role } from './config'

export type Access = Role | 'authenticated' | 'public'

/** Renders children only for users who may use them; otherwise a sign-in or no-access screen. */
export function RequireRole({ access, children }: { access: Access; children: ReactNode }) {
  const { status, user, login, hasRole } = useAuth()
  if (access === 'public') return children
  if (status === 'loading') {
    return (
      <div className="cluster" style={{ justifyContent: 'center', padding: 64 }}>
        <Spinner size={22} />
      </div>
    )
  }
  if (status === 'anonymous') {
    return (
      <EmptyState
        icon={<LogIn />}
        title="Sign in to continue"
        description={
          access === 'authenticated' ? 'This page needs an account.' : <>This page needs the <strong>{ROLE_LABELS[access]}</strong> role.</>
        }
        action={
          <Button variant="primary" icon={<LogIn />} onClick={login}>
            Sign in with Keycloak
          </Button>
        }
      />
    )
  }
  if (access !== 'authenticated' && !hasRole(access)) {
    return (
      <EmptyState
        icon={<ShieldAlert />}
        title="You don't have access"
        description={
          <>
            Signed in as <strong>{user?.username}</strong>. This page needs <Badge tone="accent">{access}</Badge>.
          </>
        }
      />
    )
  }
  return children
}
