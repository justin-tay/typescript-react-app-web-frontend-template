const EXPIRED_KEY = 'auth.sessionExpired'

/**
 * Remembers that this tab lost its session without the person choosing to leave, so the
 * sign-in card can say so. It lives in sessionStorage so a refresh of the card still shows it;
 * it is only forgotten by a successful sign-in or a deliberate sign-out (`clearSessionExpired`).
 */
export function markSessionExpired(): void {
  sessionStorage.setItem(EXPIRED_KEY, '1')
}

export function clearSessionExpired(): void {
  sessionStorage.removeItem(EXPIRED_KEY)
}

export function hasSessionExpired(): boolean {
  return sessionStorage.getItem(EXPIRED_KEY) !== null
}
