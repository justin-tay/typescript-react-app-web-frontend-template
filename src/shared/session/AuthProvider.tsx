import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { failureKind } from '@/shared/lib/api-errors'
import { clearPersistedTableState } from '@/shared/lib/use-paged-list'
import { fetchLoginUser, logout, type LoginUser } from './api'
import { AuthContext, type AuthState } from './auth-context'
import {
  broadcastSignedOut,
  listenForSignedOutElsewhere,
  setSessionEndedHandler,
  type SessionEndReason,
} from './session-broadcast'
import { clearSessionExpired, hasSessionExpired, markSessionExpired } from './session-expired'

const errorState = (e: unknown): AuthState => {
  console.error(e)
  return { status: 'error', kind: failureKind(e), message: e instanceof Error ? e.message : String(e) }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  // Whether this tab has ever been authenticated, so a later drop to anonymous can be told
  // apart from simply never having been signed in (see session-broadcast.ts): only the
  // former is a real "you were signed in, and now you're not" event worth declaring.
  const wasAuthenticated = useRef(false)

  const applyUser = useCallback((user: LoginUser | null) => {
    if (user) {
      wasAuthenticated.current = true
      clearSessionExpired()
      setState({ status: 'authenticated', user })
      return
    }
    if (wasAuthenticated.current) {
      markSessionExpired()
      broadcastSignedOut('expired')
    }
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
      // their own next request happens to fail.
      clearSessionExpired()
      broadcastSignedOut('signed-out')
      window.location.assign(logoutUrl)
    } catch (e) {
      setState(errorState(e))
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
  // card where this tab is. See session-broadcast.ts.
  useEffect(() => {
    const endSession = (reason: SessionEndReason) => {
      clearPersistedTableState()
      if (reason === 'expired') markSessionExpired()
      else clearSessionExpired()
      setState({ status: 'anonymous', signedOut: true, expired: reason === 'expired' })
    }
    const stopHandling = setSessionEndedHandler(endSession)
    const stopListening = listenForSignedOutElsewhere(endSession)
    return () => {
      stopHandling()
      stopListening()
    }
  }, [])

  const value = useMemo(() => ({ state, reload, signOut }), [state, reload, signOut])
  return <AuthContext value={value}>{children}</AuthContext>
}
