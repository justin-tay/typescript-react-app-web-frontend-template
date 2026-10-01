const EXPIRED_KEY = 'auth.sessionExpired'

/**
 * Remembers that this tab lost its session without the person choosing to leave, so the
 * sign-in card can say so. It lives in sessionStorage so a refresh of the card still shows it;
 * it is only forgotten by a successful sign-in or a deliberate sign-out (`clearSessionExpired`).
 * Storage can be unavailable, and ending a session must not fail because of it: then the card
 * just does not say why.
 */
export function markSessionExpired(): void {
  try {
    sessionStorage.setItem(EXPIRED_KEY, '1')
  } catch {
    // Not remembered across a refresh.
  }
}

export function clearSessionExpired(): void {
  try {
    sessionStorage.removeItem(EXPIRED_KEY)
  } catch {
    // Nothing was remembered.
  }
}

export function hasSessionExpired(): boolean {
  try {
    return sessionStorage.getItem(EXPIRED_KEY) !== null
  } catch {
    return false
  }
}
