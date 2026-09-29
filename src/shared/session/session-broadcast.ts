import { clearPersistedTableState } from '@/shared/lib/use-paged-list'

const CHANNEL_NAME = 'app:session'
const SIGNED_OUT = 'signed-out'

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel {
  channel ??= new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/**
 * Tells every other open tab that the session has ended. Saved table state (search text,
 * filters) belongs to the person who has just left, so it is forgotten here; every other
 * tab forgets its own when it hears this, since sessionStorage is per tab.
 */
export function broadcastSignedOut(): void {
  clearPersistedTableState()
  getChannel().postMessage(SIGNED_OUT)
}

let onSessionEnded: () => void = () => {}

/**
 * Registers what this tab does when a request finds the session gone (see
 * `declareSignedOut`). `AuthProvider` sets it to show the sign-in card in place. Returns a
 * function that removes it again.
 */
export function setSessionEndedHandler(handler: () => void): () => void {
  onSessionEnded = handler
  return () => {
    if (onSessionEnded === handler) onSessionEnded = () => {}
  }
}

/**
 * Declares that the session has ended, for any reason: the idle timeout, the backend's
 * non-extendable absolute timeout (see docs/adr in the backend), an admin revoking the
 * session, or logging out from another tab. Every open tab, including this one, then shows
 * the sign-in card where it is, so nobody is left looking at pages that no longer work.
 */
export function declareSignedOut(): void {
  broadcastSignedOut()
  onSessionEnded()
}

/**
 * Subscribes this tab to another tab's `declareSignedOut()` / `broadcastSignedOut()`.
 * Call once for the app's lifetime (see `AuthProvider`); returns an unsubscribe function.
 */
export function listenForSignedOutElsewhere(onSignedOut: () => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data === SIGNED_OUT) onSignedOut()
  }
  const c = getChannel()
  c.addEventListener('message', handler)
  return () => c.removeEventListener('message', handler)
}
