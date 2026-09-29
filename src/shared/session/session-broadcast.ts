const CHANNEL_NAME = 'app:session'
const SIGNED_OUT = 'signed-out'

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel {
  channel ??= new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/** Sends every other open tab to the same "you have been logged out" page as this one. */
export function broadcastSignedOut(): void {
  getChannel().postMessage(SIGNED_OUT)
}

/** Navigates this tab to the login page's logged-out message, unless already there. */
export function goToLoggedOutPage(): void {
  if (location.pathname === '/login') return
  window.location.assign('/login?logout')
}

/**
 * Declares that the session has ended, for any reason: the idle timeout, the backend's
 * non-extendable absolute timeout (see docs/adr in the backend), an admin revoking the
 * session, or logging out from another tab. There is nothing meaningful left to show
 * behind it, so every open tab, including this one, is sent to the same page a normal
 * logout shows.
 */
export function declareSignedOut(): void {
  broadcastSignedOut()
  goToLoggedOutPage()
}

/**
 * Subscribes this tab to another tab's `declareSignedOut()` / `broadcastSignedOut()`.
 * Call once for the app's lifetime (see `AuthProvider`); returns an unsubscribe function.
 */
export function listenForSignedOutElsewhere(onSignedOut: () => void = goToLoggedOutPage): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data === SIGNED_OUT) onSignedOut()
  }
  const c = getChannel()
  c.addEventListener('message', handler)
  return () => c.removeEventListener('message', handler)
}
