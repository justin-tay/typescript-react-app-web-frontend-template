import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { failureKind } from '@/shared/lib/api-errors'
import { clearPersistedTableState } from '@/shared/lib/table-state-storage'
import { fetchLoginUser, logout, type LoginUser } from './api'
import { AuthContext, type AuthState } from './auth-context'
import { clearSessionExpired, endSession, hasSessionExpired, onSessionEnd } from './session-end'

const errorState = (e: unknown): AuthState => {
  console.error(e)
  return { status: 'error', kind: failureKind(e), message: e instanceof Error ? e.message : String(e) }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  // Whether this tab has ever been authenticated, so a later drop to anonymous can be told
  // apart from simply never having been signed in (see session-end.ts): only the
  // former is a real "you were signed in, and now you're not" event worth declaring.
  const wasAuthenticated = useRef(false)

  const applyUser = useCallback((user: LoginUser | null) => {
    if (user) {
      wasAuthenticated.current = true
      clearSessionExpired()
      setState({ status: 'authenticated', user })
      return
    }
    // Whenever the app settles on anonymous, saved list state (search text can name a person)
    // belongs to someone who is not here. It is cleared even when this tab never saw the session
    // end: it expired while the tab was idle or closed and the page was then refreshed, and the
    // next person to sign in must not inherit the last one's searches.
    if (wasAuthenticated.current) endSession('expired', { notifyThisTab: false })
    else clearPersistedTableState()
    setState({ status: 'anonymous', signedOut: wasAuthenticated.current, expired: hasSessionExpired() })
  }, [])

  const reload = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      applyUser(await fetchLoginUser())
    } catch (e) {
      setState(errorState(e))
    }
  }, [applyUser])

  const signOut = useCallback(async () => {
    try {
      const logoutUrl = await logout()
      // This tab is already headed to Keycloak's own end-session page and back; sibling
      // tabs need telling separately, so they don't sit on stale authenticated UI until
      // their own next request happens to fail. Only after `logout()` has succeeded: a
      // failed sign-out must not tell other tabs the session ended.
      endSession('signed-out', { notifyThisTab: false })
      window.location.assign(logoutUrl)
    } catch (e) {
      setState(errorState(e))
    }
  }, [])

  const expireSession = useCallback(async () => {
    // Before `logout()`, unlike `signOut`: other tabs hear it at once even if the call fails.
    endSession('expired', { notifyThisTab: false })
    try {
      // Ends Keycloak's session too, and its end-session page returns to the sign-in card, which
      // says the session expired because of the flag set above.
      window.location.assign(await logout())
    } catch (e) {
      // The server session may already be gone, so there is nothing more to end: show the card here.
      console.error(e)
      setState({ status: 'anonymous', signedOut: true, expired: true })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchLoginUser().then(
      (user) => !cancelled && applyUser(user),
      (e: unknown) => !cancelled && setState(errorState(e)),
    )
    return () => {
      cancelled = true
    }
  }, [applyUser])

  // The session ended, discovered here by a request or announced by another tab (idle
  // timeout, absolute timeout, an admin revoking it, or logging out there): show the sign-in
  // card where this tab is. See session-end.ts, which has already forgotten the saved state.
  useEffect(
    () => onSessionEnd((reason) => setState({ status: 'anonymous', signedOut: true, expired: reason === 'expired' })),
    [],
  )

  const value = useMemo(() => ({ state, reload, signOut, expireSession }), [state, reload, signOut, expireSession])
  return <AuthContext value={value}>{children}</AuthContext>
}
