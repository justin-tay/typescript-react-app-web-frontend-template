import { Button, GovtBanner, Infobox, Spinner } from '@opengovsg/oui'
import { Navigate, useSearchParams } from 'react-router'
import { LOGIN_PATH } from '../auth/api'
import { useAuth } from '../auth/auth-context'
import { APP_NAME } from '../config'

export function Login() {
  const { state, reload } = useAuth()
  const [params] = useSearchParams()

  if (state.status === 'authenticated') return <Navigate to="/profile" replace />

  return (
    <div className="flex min-h-screen flex-col">
      <GovtBanner />
      <main className="flex flex-1 items-center justify-center bg-linear-to-br from-slate-100 via-white to-indigo-100 px-4 py-12">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
            <p className="text-base-content-medium">Log in to continue</p>
          </div>
          {params.has('logout') && state.status !== 'error' && (
            <Infobox variant="info">You have been logged out.</Infobox>
          )}
          {state.status === 'error' && (
            <>
              <Infobox variant="error">{state.message}</Infobox>
              <Button variant="outline" onPress={() => void reload()}>
                Try again
              </Button>
            </>
          )}
          {state.status === 'loading' && (
            <div className="flex justify-center">
              <Spinner aria-label="Loading" />
            </div>
          )}
          {state.status === 'anonymous' && (
            <Button size="lg" className="w-full" onPress={() => window.location.assign(LOGIN_PATH)}>
              Log in
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
