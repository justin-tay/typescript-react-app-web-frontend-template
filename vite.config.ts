import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'

// The backend authenticates through Keycloak with a server-side session cookie, so the
// browser must see one origin: these paths are proxied to the backend, and Keycloak's
// redirect URI must be registered for this dev server's origin (see README).
const proxied = ['/login-user', '/oauth2', '/login/oauth2', '/logout']

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    // Keycloak matches redirect URIs exactly, so never drift to another port.
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(
      proxied.map((path) => [path, { target: backend, xfwd: true }]),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
