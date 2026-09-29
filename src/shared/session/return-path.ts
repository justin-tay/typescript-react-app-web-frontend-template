const RETURN_PATH_KEY = 'auth.returnPath'

/**
 * Remembers the page to return to after a login round trip through Keycloak. That
 * navigation is not one Spring Security intercepted, so there is no saved request for it
 * to restore: the login always lands the browser back on "/", and `consumeReturnPath` is
 * how the app sends the visitor on from there. Used both for a first sign-in from a
 * protected route (see `RequireAuth`) and for step-up re-authentication (see
 * `admin/reauth.ts`).
 */
export function rememberReturnPath(path: string): void {
  sessionStorage.setItem(RETURN_PATH_KEY, path)
}

/** Reads and clears the path saved by `rememberReturnPath`, if any is pending. */
export function consumeReturnPath(): string | null {
  const path = sessionStorage.getItem(RETURN_PATH_KEY)
  if (path) sessionStorage.removeItem(RETURN_PATH_KEY)
  return path
}
