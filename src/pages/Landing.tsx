import { Button, Infobox, Spinner } from '@opengovsg/oui'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { consumeReturnPath } from '../auth/return-path'
import { APP_NAME } from '../config'

export function Landing() {
  const { state, reload } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // A login round trip through Keycloak (a first sign-in from a protected route, or a
    // step-up re-authentication) always lands back on "/"; send the visitor on to the page
    // they actually wanted (see auth/return-path.ts).
    if (state.status !== 'authenticated') return
    const returnPath = consumeReturnPath()
    if (returnPath) navigate(returnPath, { replace: true })
  }, [state.status, navigate])

  if (state.status === 'error') {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Infobox variant="error">{state.message}</Infobox>
        <div>
          <Button onPress={() => void reload()}>Try again</Button>
        </div>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-linear-to-br from-slate-100 via-white to-indigo-100 px-8 py-16">
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="max-w-2xl text-lg text-base-content-medium">
        A starting point for building public-sector web apps, signing in through your
        identity provider.
      </p>
      <div>
        {state.status === 'loading' && <Spinner aria-label="Loading" />}
        {state.status === 'anonymous' && (
          <Button size="lg" onPress={() => void navigate('/login')}>
            Log in
          </Button>
        )}
        {state.status === 'authenticated' && (
          <Button size="lg" variant="outline" onPress={() => void navigate('/account')}>
            Go to my account
          </Button>
        )}
      </div>
    </section>
  )
}
