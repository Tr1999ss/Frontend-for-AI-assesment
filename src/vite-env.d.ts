/// <reference types="vite/client" />

/** Injected by vite.config.ts `define`. */
declare const __BACKEND_URL__: string

interface ImportMetaEnv {
  readonly VITE_KEYCLOAK_URL?: string
  readonly VITE_KEYCLOAK_REALM?: string
  readonly VITE_OIDC_CLIENT_ID?: string
}
