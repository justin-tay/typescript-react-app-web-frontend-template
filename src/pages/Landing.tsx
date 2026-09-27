import { Button, Infobox, Spinner } from '@opengovsg/oui'
import { Link } from 'react-router'
import { LOGIN_PATH } from '../auth/api'
import { useAuth } from '../auth/auth-context'
import { APP_NAME } from '../config'

export function Landing() {
  const { state, reload } = useAuth()

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
    <section className="flex max-w-2xl flex-col gap-6 py-8">
      <h1 className="text-4xl font-semibold tracking-tight">{APP_NAME}</h1>
      <p className="text-lg text-base-content-medium">
        A starting point for building public-sector web apps, signing in through your
        identity provider.
      </p>
      <div>
        {state.status === 'loading' && <Spinner aria-label="Loading" />}
        {state.status === 'anonymous' && (
          <Button size="lg" onPress={() => window.location.assign(LOGIN_PATH)}>
            Log in
          </Button>
        )}
        {state.status === 'authenticated' && (
          <Link to="/profile">
            <Button size="lg" variant="outline">
              Go to profile
            </Button>
          </Link>
        )}
      </div>
    </section>
  )
}
