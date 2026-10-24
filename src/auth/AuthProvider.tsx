import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'oidc-client-ts'
import { configureApiAuth } from '../api/client'
import { grants, type Role } from './config'
import { completeSignin, isSigninCallback, rolesOf, userManager } from './oidc'

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated'

export interface AuthUser {
  username: string
  name: string
  email?: string
  roles: string[]
}

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  error: unknown
  login: () => Promise<void>
  logout: () => Promise<void>
  hasRole: (role: Role) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toAuthUser(user: User): AuthUser {
  const profile = user.profile
  const username = profile.preferred_username ?? profile.sub
  return {
    username,
    name: profile.name ?? ([profile.given_name, profile.family_name].filter(Boolean).join(' ') || username),
    email: profile.email,
    roles: rolesOf(user),
  }
}

async function currentToken(): Promise<string | null> {
  const user = await userManager.getUser()
  if (!user) return null
  if (!user.expired) return user.access_token
  try {
    return (await userManager.signinSilent())?.access_token ?? null
  } catch {
    return null
  }
}

// The API client and MCP transport ask for a token per request, so renewals apply immediately.
configureApiAuth(currentToken)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [oidcUser, setOidcUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let cancelled = false
    const settle = (user: User | null) => {
      if (cancelled) return
      setOidcUser(user && !user.expired ? user : null)
      setStatus(user && !user.expired ? 'authenticated' : 'anonymous')
    }

    ;(isSigninCallback() ? completeSignin() : userManager.getUser())
      .then(settle)
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e)
        setStatus('anonymous')
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`)
      })

    const onLoaded = (user: User) => settle(user)
    const onUnloaded = () => settle(null)
    const onRenewError = () => settle(null)
    userManager.events.addUserLoaded(onLoaded)
    userManager.events.addUserUnloaded(onUnloaded)
    userManager.events.addSilentRenewError(onRenewError)
    return () => {
      cancelled = true
      userManager.events.removeUserLoaded(onLoaded)
      userManager.events.removeUserUnloaded(onUnloaded)
      userManager.events.removeSilentRenewError(onRenewError)
    }
  }, [])

  const login = useCallback(async () => {
    setError(null)
    try {
      await userManager.signinRedirect({ state: { hash: window.location.hash } })
    } catch (e) {
      setError(e)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await userManager.signoutRedirect({ id_token_hint: oidcUser?.id_token })
    } catch {
      // identity provider unreachable: at least forget the local session
      await userManager.removeUser()
    }
  }, [oidcUser])

  const user = useMemo(() => (oidcUser ? toAuthUser(oidcUser) : null), [oidcUser])
  const hasRole = useCallback((role: Role) => grants(user?.roles ?? [], role), [user])

  const value = useMemo(() => ({ status, user, error, login, logout, hasRole }), [status, user, error, login, logout, hasRole])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
