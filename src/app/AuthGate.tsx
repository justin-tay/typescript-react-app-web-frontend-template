import { Spinner } from '@opengovsg/oui'
import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Login } from '@/features/login/Login'
import { useAuth } from '@/shared/session/auth-context'
import { ReauthReturnNotice } from '@/shared/session/ReauthReturnNotice'
import { consumeReturnPath } from '@/shared/session/return-path'

/**
 * Everything behind it needs a signed-in user. Until then the sign-in card is shown right
 * here, at whatever URL was asked for, instead of redirecting to a login page: the address
 * never changes, a refresh or a deep link just works, and when the session ends in any tab
 * the card appears in place, so no tab is left showing pages that no longer work.
 *
 * An SSO login leaves the page for Keycloak and comes back to the fixed "/" it has
 * registered, so the page asked for is remembered before leaving (see `Login`) and the
 * visitor is sent on to it from "/" once signed in.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (state.status !== 'authenticated' || pathname !== '/') return
    const returnPath = consumeReturnPath()
    if (returnPath) navigate(returnPath, { replace: true })
  }, [state.status, pathname, navigate])

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner aria-label="Loading" />
      </div>
    )
  }
  if (state.status !== 'authenticated') return <Login />
  return (
    <>
      <ReauthReturnNotice />
      {children}
    </>
  )
}
