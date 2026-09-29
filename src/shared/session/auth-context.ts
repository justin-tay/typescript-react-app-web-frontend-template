import { createContext, useContext } from 'react'
import type { FailureKind } from '@/shared/lib/api-errors'
import type { LoginUser } from './api'

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: LoginUser }
  /** `message` is developer detail (logged to the console), not for display: show `kind`. */
  | { status: 'error'; kind: FailureKind; message: string }

export interface Auth {
  state: AuthState
  reload: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside AuthProvider')
  return auth
}
