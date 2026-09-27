import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'

// The backend authenticates through Keycloak with a server-side session cookie, so the
// browser must see one origin. Two kinds of paths are proxied to the backend:
//
// - OAuth flow paths, kept at their real backend paths (never under /api): Keycloak's
//   registered redirect URI is Spring Security's fixed "{baseUrl}/login/oauth2/code/
//   keycloak", so this one especially cannot move.
// - Everything else the frontend calls with fetch, under /api/*, stripped before
//   forwarding. Namespacing these away from the app's own routes means a future page
//   route can never collide with a backend path the way /admin/users once did here.
//
// Keycloak's redirect URI must be registered for this dev server's origin (see README).
const oauthFlowPaths = ['/oauth2', '/login/oauth2']

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    // Keycloak matches redirect URIs exactly, so never drift to another port.
    port: 5173,
    strictPort: true,
    proxy: {
      ...Object.fromEntries(oauthFlowPaths.map((path) => [path, { target: backend, xfwd: true }])),
      '/api': {
        target: backend,
        xfwd: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
