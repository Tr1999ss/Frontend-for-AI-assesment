// Identity provider settings. Defaults match compose.yaml + docker/keycloak/generic-realm.json
// in the backend repo; override with VITE_* variables in .env.local.

const env = import.meta.env

export const KEYCLOAK_URL: string = env.VITE_KEYCLOAK_URL ?? 'http://localhost:8180'
export const KEYCLOAK_REALM: string = env.VITE_KEYCLOAK_REALM ?? 'generic'
export const OIDC_CLIENT_ID: string = env.VITE_OIDC_CLIENT_ID ?? 'generic-cli'

/** Realm roles from com.shk.generic.security.Roles; each includes the ones before it. */
export const ROLES = ['kb-reader', 'kb-editor', 'kb-admin'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  'kb-reader': 'Reader',
  'kb-editor': 'Editor',
  'kb-admin': 'Admin',
}

/** Mirrors the backend RoleHierarchy: admin ⊃ editor ⊃ reader. */
export function grants(held: readonly string[], required: Role): boolean {
  const needed = ROLES.indexOf(required)
  return held.some((r) => ROLES.indexOf(r as Role) >= needed)
}
