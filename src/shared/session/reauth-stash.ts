const STASH_KEY = 'auth.reauthDraft'
const TTL_MS = 10 * 60 * 1000

export interface ReauthDraft {
  /** Which form saved it, so only that form resumes it. */
  key: string
  /** Who was signed in; a different user returning must not submit this person's change. */
  userId: string
  draft: unknown
}

interface Stored extends ReauthDraft {
  savedAt: number
}

/**
 * Remembers what a form held when a sensitive change sent the browser away to sign in again
 * (see `reauth.ts`). One slot, in sessionStorage so it survives the round trip, and dropped
 * after ten minutes so an abandoned sign-in does not leave personal data behind. If storage is
 * unavailable the form is simply not restored.
 */
export function saveReauthDraft(entry: ReauthDraft): void {
  try {
    sessionStorage.setItem(STASH_KEY, JSON.stringify({ ...entry, savedAt: Date.now() } satisfies Stored))
  } catch {
    // Not remembered.
  }
}

/** The saved draft if there is a fresh one; it stays until `clearReauthDraft`. */
export function peekReauthDraft(): ReauthDraft | null {
  try {
    const raw = sessionStorage.getItem(STASH_KEY)
    if (!raw) return null
    const { savedAt, ...entry } = JSON.parse(raw) as Stored
    if (typeof savedAt !== 'number' || Date.now() - savedAt >= TTL_MS) {
      sessionStorage.removeItem(STASH_KEY)
      return null
    }
    return entry
  } catch {
    return null
  }
}

export function clearReauthDraft(): void {
  try {
    sessionStorage.removeItem(STASH_KEY)
  } catch {
    // Nothing was remembered.
  }
}
