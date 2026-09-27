import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchLoginUser, logout } from './api'
import { AuthContext, type AuthState } from './auth-context'

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const reload = useCallback(async () => {
    try {
      const user = await fetchLoginUser()
      setState(user ? { status: 'authenticated', user } : { status: 'anonymous' })
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
    void reload()
  }, [reload])

  const value = useMemo(() => ({ state, reload, signOut }), [state, reload, signOut])
  return <AuthContext value={value}>{children}</AuthContext>
}
