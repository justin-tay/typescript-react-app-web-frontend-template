import { LOGIN_PATH } from '../auth/api'

const RETURN_PATH_KEY = 'admin.reauth.returnPath'

/**
 * Sends the browser to log in again at Keycloak (`max_age=0` forces a fresh
 * authentication), remembering the page to return to. This navigation is not one Spring
 * Security intercepted, so there is no saved request for it to restore: the login always
 * lands back on "/", and `consumeReturnPath` is how the app sends the visitor on from
 * there. Anything the visitor was mid-typing in a form is not restored.
 */
export function beginReauthentication(returnPath: string): void {
  sessionStorage.setItem(RETURN_PATH_KEY, returnPath)
  window.location.assign(`${LOGIN_PATH}?max_age=0`)
}

/** Reads and clears the path saved by `beginReauthentication`, if any is pending. */
export function consumeReauthReturnPath(): string | null {
  const path = sessionStorage.getItem(RETURN_PATH_KEY)
  if (path) sessionStorage.removeItem(RETURN_PATH_KEY)
  return path
}
