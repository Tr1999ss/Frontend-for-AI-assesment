import { UserManager, type User } from 'oidc-client-ts'
import { KEYCLOAK_REALM, KEYCLOAK_URL, OIDC_CLIENT_ID } from './config'

/**
 * Authorization Code + PKCE against Keycloak.
 *
 * The browser navigates to Keycloak directly for login/logout, but back-channel calls
 * (token, userinfo, keys) go through the Vite proxy at /realms so they are same-origin and
 * need no CORS setup. The issuer stays Keycloak's own URL, which is what the backend checks.
 */
function createUserManager(): UserManager {
  const issuer = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`
  const proxied = `${window.location.origin}/realms/${KEYCLOAK_REALM}`
  const appUrl = `${window.location.origin}/`
  return new UserManager({
    authority: issuer,
    client_id: OIDC_CLIENT_ID,
    redirect_uri: appUrl,
    post_logout_redirect_uri: appUrl,
    scope: 'openid profile email',
    automaticSilentRenew: true,
    metadata: {
      issuer,
      authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
      end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
      token_endpoint: `${proxied}/protocol/openid-connect/token`,
      userinfo_endpoint: `${proxied}/protocol/openid-connect/userinfo`,
      revocation_endpoint: `${proxied}/protocol/openid-connect/revoke`,
      jwks_uri: `${proxied}/protocol/openid-connect/certs`,
    },
  })
}

export const userManager = createUserManager()

/** True when the current URL is Keycloak redirecting back with an authorization code. */
export function isSigninCallback(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('state') && (params.has('code') || params.has('error'))
}

/** Completes the redirect, then strips ?code=&state= while keeping the hash route. */
export async function completeSignin(): Promise<User> {
  const user = await userManager.signinRedirectCallback()
  const state = user.state as { hash?: string } | undefined
  window.history.replaceState(null, '', `${window.location.pathname}${state?.hash ?? window.location.hash}`)
  return user
}

/** Realm roles from Keycloak's access token claim realm_access.roles. */
export function rolesOf(user: User | null): string[] {
  if (!user?.access_token) return []
  try {
    const payload = JSON.parse(atob(user.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.realm_access?.roles ?? []
  } catch {
    return []
  }
}
