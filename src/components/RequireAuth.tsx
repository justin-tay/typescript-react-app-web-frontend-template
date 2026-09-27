import { Button, Infobox, Spinner } from '@opengovsg/oui'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { rememberReturnPath } from '../auth/return-path'

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
      <div className="flex flex-col gap-4 p-6">
        <Infobox variant="error">{state.message}</Infobox>
        <div>
          <Button onPress={() => void reload()}>Try again</Button>
        </div>
      </div>
    )
  }

  if (state.status === 'anonymous') {
    rememberReturnPath(location.pathname)
    return <Navigate to="/login" replace />
  }

  return children
}
