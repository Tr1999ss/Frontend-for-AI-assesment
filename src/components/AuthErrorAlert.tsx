import { LogIn } from 'lucide-react'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { ROLE_LABELS, type Role } from '../auth/config'
import { Alert, Button } from '../ui'
import { ApiErrorAlert } from './ApiErrorAlert'

/**
 * ApiErrorAlert plus the two auth failures: a 401 (session expired or revoked) offers to sign in
 * again and returns to this page; a 403 says which role the operation needs.
 */
export function AuthErrorAlert({ error, role = 'kb-admin', onDismiss }: { error: unknown; role?: Role; onDismiss?: () => void }) {
  const { login } = useAuth()
  if (error instanceof ApiError && error.status === 401) {
    return (
      <Alert
        tone="warning"
        title="Your session has expired"
        onDismiss={onDismiss}
        action={
          <Button size="sm" variant="primary" icon={<LogIn />} onClick={login}>
            Sign in again
          </Button>
        }
      >
        Sign in again to continue. You will come back to this page.
      </Alert>
    )
  }
  if (error instanceof ApiError && error.status === 403) {
    return (
      <Alert tone="danger" title={`${ROLE_LABELS[role]} only`} onDismiss={onDismiss}>
        This needs the <span className="mono">{role}</span> role. Ask an administrator for access.
      </Alert>
    )
  }
  return <ApiErrorAlert error={error} onDismiss={onDismiss} />
}
