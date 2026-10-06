import { clearPersistedTableState } from '@/shared/lib/table-state-storage'

/**
 * What happens when a session ends, in one place so no way of ending it can forget a step
 * (ADR 0003: saved list state, whose search text can name a person, belongs to whoever has
 * just left). Ending a session:
 *
 * 1. forgets the previous person's saved table state (also done whenever the app settles on
 *    anonymous without a session end, e.g. a refresh after the session expired while the
 *    tab was idle: `AuthProvider` calls `clearPersistedTableState` for that);
 * 2. remembers `expired`, or forgets it for `signed-out`, so the sign-in card can say why;
 * 3. tells every other open tab, which does the same for itself (sessionStorage is per tab);
 * 4. tells this tab's listener, which shows the sign-in card where the tab is (unless the
 *    caller is taking the tab elsewhere).
 *
 * It makes no network calls: ending the server session (`logout()`) stays with the caller,
 * which decides whether that comes before or after `endSession`. Requests that find the
 * session gone call `endSession('expired')` from `shared/lib/api-errors`.
 */

const CHANNEL_NAME = 'app:session'
const EXPIRED_KEY = 'auth.sessionExpired'

/** `signed-out` is the person leaving on purpose; `expired` is any other way the session ends. */
export type SessionEndReason = 'signed-out' | 'expired'

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel {
  channel ??= new BroadcastChannel(CHANNEL_NAME)
  return channel
}

// Storage can be unavailable, and ending a session must not fail because of it: then the
// sign-in card just does not say why.
function setExpired(expired: boolean): void {
  try {
    if (expired) sessionStorage.setItem(EXPIRED_KEY, '1')
    else sessionStorage.removeItem(EXPIRED_KEY)
  } catch {
    // Not remembered across a refresh.
  }
}

/**
 * Whether this tab lost its session without the person choosing to leave. It lives in
 * sessionStorage so a refresh of the sign-in card still says so; a deliberate sign-out
 * forgets it, and so does a successful sign-in (`clearSessionExpired`).
 */
export function hasSessionExpired(): boolean {
  try {
    return sessionStorage.getItem(EXPIRED_KEY) !== null
  } catch {
    return false
  }
}

/** Forgets that the session expired; a successful sign-in calls this. */
export function clearSessionExpired(): void {
  setExpired(false)
}

const listeners = new Set<(reason: SessionEndReason) => void>()

function applyEnd(reason: SessionEndReason, notifyThisTab = true): void {
  clearPersistedTableState()
  setExpired(reason === 'expired')
  if (notifyThisTab) for (const listener of listeners) listener(reason)
}

let hearingOtherTabs: ((event: MessageEvent) => void) | null = null

function hearOtherTabs(): void {
  hearingOtherTabs = (event) => {
    // Another tab already told everyone; broadcasting again would echo between tabs forever.
    if (event.data === 'signed-out' || event.data === 'expired') applyEnd(event.data)
  }
  getChannel().addEventListener('message', hearingOtherTabs)
}

/**
 * Ends the session from this tab, for any reason: the person leaving, the idle timeout, or a
 * request finding the session gone (the backend's idle or absolute timeout, an admin revoking
 * it, or logging out from another tab). Every open tab, including this one, then shows the
 * sign-in card where it is, so nobody is left looking at pages that no longer work.
 *
 * A caller that is itself taking this tab somewhere else (to Keycloak's end-session page) or
 * that sets this tab's state itself passes `{ notifyThisTab: false }`, so this tab's listener
 * does not also flash the sign-in card.
 */
export function endSession(reason: SessionEndReason, { notifyThisTab = true } = {}): void {
  getChannel().postMessage(reason)
  applyEnd(reason, notifyThisTab)
}

/**
 * Runs `listener` whenever the session ends, whether this tab ended it or another one did,
 * after the table state is forgotten and the expired flag is set. Call once for the app's
 * lifetime (see `AuthProvider`); returns a function that removes it.
 */
export function onSessionEnd(listener: (reason: SessionEndReason) => void): () => void {
  listeners.add(listener)
  if (!hearingOtherTabs) hearOtherTabs()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && hearingOtherTabs) {
      getChannel().removeEventListener('message', hearingOtherTabs)
      hearingOtherTabs = null
    }
  }
}
