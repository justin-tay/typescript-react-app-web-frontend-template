import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { failureKind } from '@/shared/lib/api-errors'
import { fetchLoginUser, logout, type LoginUser } from './api'
import { AuthContext, type AuthState } from './auth-context'
import { broadcastSignedOut, listenForSignedOutElsewhere } from './session-broadcast'

const errorState = (e: unknown): AuthState => {
  console.error(e)
  return { status: 'error', kind: failureKind(e), message: e instanceof Error ? e.message : String(e) }
}

const toState = (user: LoginUser | null): AuthState =>
  user ? { status: 'authenticated', user } : { status: 'anonymous' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  // Whether this tab has ever been authenticated, so a later drop to anonymous can be told
  // apart from simply never having been signed in (see session-broadcast.ts): only the
  // former is a real "you were signed in, and now you're not" event worth declaring.
  const wasAuthenticated = useRef(false)

  const applyState = useCallback((next: AuthState) => {
    if (next.status === 'anonymous' && wasAuthenticated.current) {
      broadcastSignedOut()
    }
    if (next.status === 'authenticated') wasAuthenticated.current = true
    setState(next)
  }, [])

  const reload = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      applyState(toState(await fetchLoginUser()))
    } catch (e) {
      setState(errorState(e))
    }
  }, [applyState])

  const signOut = useCallback(async () => {
    try {
      const logoutUrl = await logout()
      // This tab is already headed to Keycloak's own end-session page and back; sibling
      // tabs need telling separately, so they don't sit on stale authenticated UI until
      // their own next request happens to fail.
      broadcastSignedOut()
      window.location.assign(logoutUrl)
    } catch (e) {
      setState(errorState(e))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchLoginUser().then(
      (user) => !cancelled && applyState(toState(user)),
      (e: unknown) => !cancelled && setState(errorState(e)),
    )
    return () => {
      cancelled = true
    }
  }, [applyState])

  // A sibling tab's session-ended event (idle timeout, absolute timeout, admin
  // revocation, or logging out there) navigates this tab too; see session-broadcast.ts.
  useEffect(() => listenForSignedOutElsewhere(), [])

  const value = useMemo(() => ({ state, reload, signOut }), [state, reload, signOut])
  return <AuthContext value={value}>{children}</AuthContext>
}
