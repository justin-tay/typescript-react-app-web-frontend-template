import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchLoginUser, logout, type LoginUser } from './api'
import { AuthContext, type AuthState } from './auth-context'

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

const toState = (user: LoginUser | null): AuthState =>
  user ? { status: 'authenticated', user } : { status: 'anonymous' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const reload = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      setState(toState(await fetchLoginUser()))
    } catch (e) {
      setState({ status: 'error', message: messageOf(e) })
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      window.location.assign(await logout())
    } catch (e) {
      setState({ status: 'error', message: messageOf(e) })
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchLoginUser().then(
      (user) => !cancelled && setState(toState(user)),
      (e: unknown) => !cancelled && setState({ status: 'error', message: messageOf(e) }),
    )
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ state, reload, signOut }), [state, reload, signOut])
  return <AuthContext value={value}>{children}</AuthContext>
}
