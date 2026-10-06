import { createContext, useContext } from 'react'
import type { FailureKind } from '@/shared/lib/api-errors'
import type { LoginUser } from './api'

export type AuthState =
  | { status: 'loading' }
  /**
   * `signedOut` is true when the person had been signed in and the session has since ended.
   * `expired` is true when it ended without them choosing to leave (see `session-end.ts`).
   */
  | { status: 'anonymous'; signedOut: boolean; expired: boolean }
  | { status: 'authenticated'; user: LoginUser }
  /** `message` is developer detail (logged to the console), not for display: show `kind`. */
  | { status: 'error'; kind: FailureKind; message: string }

export interface Auth {
  state: AuthState
  reload: () => Promise<void>
  signOut: () => Promise<void>
  /**
   * The idle countdown reached zero: ends the session the way `signOut` does, but remembered as
   * expired so the sign-in card says so. If the sign-out call fails, the card is shown in place.
   */
  expireSession: () => Promise<void>
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}

/**
 * The signed-in user, for the pages behind `AuthGate`, which only renders them once someone
 * is signed in. Throws if used anywhere else.
 */
export function useCurrentUser(): LoginUser {
  const { state } = useAuth()
  if (state.status !== 'authenticated') throw new Error('useCurrentUser must be used behind AuthGate')
  return state.user
}
