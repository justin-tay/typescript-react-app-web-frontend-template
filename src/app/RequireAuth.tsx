import { Spinner } from '@opengovsg/oui'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '@/shared/session/auth-context'
import { rememberReturnPath } from '@/shared/session/return-path'
import { ServiceUnavailable } from '@/shared/ui/service-unavailable'

/**
 * Guards a route that needs a signed-in user. An anonymous visitor is sent to `/login`,
 * remembering this page first so a successful login returns here (see
 * `auth/return-path.ts`) instead of the default landing page.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, reload } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return (
      <div className="flex justify-center p-12">
        <Spinner aria-label="Loading" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <ServiceUnavailable kind={state.kind} onRetry={() => void reload()} className="max-w-xl p-6" />
    )
  }

  if (state.status === 'anonymous') {
    rememberReturnPath(location.pathname)
    return <Navigate to="/login" replace />
  }

  return children
}
