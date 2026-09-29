import { ApiError } from '@/shared/lib/api-errors'
import { apiFetch } from '@/shared/lib/api-fetch'
import { noteServerActivity } from './session-timeout'

export interface LoginUser {
  id: string
  username: string
  name: string
  email?: string
  roles: string[]
}

// Not under /api: this is a full browser navigation to Spring Security's own OAuth flow,
// whose callback path Keycloak's registered redirect URI depends on (see vite.config.ts).
export const LOGIN_PATH = '/oauth2/authorization/keycloak'

/** The signed-in user, or null when the backend answers 401 (no session). */
export async function fetchLoginUser(): Promise<LoginUser | null> {
  const response = await apiFetch('/api/login-user')
  if (response.status === 401) return null
  if (!response.ok) {
    throw new ApiError(`Could not load the signed-in user (HTTP ${response.status}).`, response.status)
  }
  noteServerActivity()
  return (await response.json()) as LoginUser
}

/**
 * Ends the application's session and returns the URL that ends the Keycloak session too;
 * the caller must navigate the browser there. The backend expects the CSRF cookie value
 * echoed in a header, and answers a JSON-accepting client with the URL instead of a redirect.
 */
export async function logout(): Promise<string> {
  const response = await apiFetch('/api/logout', { method: 'POST' })
  if (!response.ok) {
    throw new ApiError(`Logout failed (HTTP ${response.status}).`, response.status)
  }
  const { logoutUrl } = (await response.json()) as { logoutUrl: string }
  return logoutUrl
}
