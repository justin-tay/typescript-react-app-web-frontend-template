import { LOGIN_PATH } from './api'
import { rememberReturnPath } from './return-path'

/**
 * Sends the browser to log in again at Keycloak (`max_age=0` forces a fresh
 * authentication), remembering the page to return to (see `auth/return-path.ts`).
 * Anything the visitor was mid-typing in a form is not restored.
 */
export function beginReauthentication(returnPath: string): void {
  rememberReturnPath(returnPath)
  window.location.assign(`${LOGIN_PATH}?max_age=0`)
}
