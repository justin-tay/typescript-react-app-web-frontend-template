const RETURN_PATH_KEY = 'auth.returnPath'

/**
 * Remembers the page to return to after a login round trip through Keycloak. That
 * navigation is not one Spring Security intercepted, so there is no saved request for it
 * to restore: the login always lands the browser back on "/", and `consumeReturnPath` is
 * how the app sends the visitor on from there. Used both for a first sign-in from a
 * protected page (see `Login`) and for step-up re-authentication (see `reauth.ts`).
 * If storage is unavailable the visitor simply lands on "/".
 */
export function rememberReturnPath(path: string): void {
  try {
    sessionStorage.setItem(RETURN_PATH_KEY, path)
  } catch {
    // Not remembered.
  }
}

/** Reads and clears the path saved by `rememberReturnPath`, if any is pending. */
export function consumeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY)
    if (path) sessionStorage.removeItem(RETURN_PATH_KEY)
    return path
  } catch {
    return null
  }
}
