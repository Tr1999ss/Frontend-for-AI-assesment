import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The browser only talks to the Vite dev server; it forwards API, MCP and Keycloak
// back-channel calls, so neither the backend nor Keycloak needs CORS configuration.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.BACKEND_URL || 'http://localhost:8091'
  const keycloak = env.VITE_KEYCLOAK_URL || 'http://localhost:8180'
  const toBackend = { target: backend, changeOrigin: true }
  return {
    plugins: [react()],
    define: {
      __BACKEND_URL__: JSON.stringify(backend),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': toBackend,
        '/actuator': toBackend,
        // MCP: streamable HTTP lives at /mcp, the SSE transport at /sse + /mcp/message
        '/mcp': toBackend,
        '/sse': toBackend,
        // Keycloak token/userinfo/certs endpoints (see src/auth/oidc.ts)
        '/realms': { target: keycloak, changeOrigin: true },
      },
    },
  }
})
