import { Button, Infobox, Spinner } from '@opengovsg/oui'
import { useCallback, useEffect, useState } from 'react'
import { fetchLoginUser, LOGIN_PATH, logout, type LoginUser } from './auth/api'

type State =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: LoginUser }
  | { status: 'error'; message: string }

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e))

function App() {
  const [state, setState] = useState<State>({ status: 'loading' })

  const load = useCallback(async () => {
    try {
      const user = await fetchLoginUser()
      setState(user ? { status: 'authenticated', user } : { status: 'anonymous' })
    } catch (e) {
      setState({ status: 'error', message: messageOf(e) })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const signOut = async () => {
    try {
      window.location.assign(await logout())
    } catch (e) {
      setState({ status: 'error', message: messageOf(e) })
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Web app template</h1>
      {state.status === 'loading' && <Spinner aria-label="Loading" />}
      {state.status === 'error' && (
        <>
          <Infobox variant="error">{state.message}</Infobox>
          <Button onPress={() => void load()}>Try again</Button>
        </>
      )}
      {state.status === 'anonymous' && (
        <>
          <p>You are not logged in.</p>
          <Button onPress={() => window.location.assign(LOGIN_PATH)}>Log in</Button>
        </>
      )}
      {state.status === 'authenticated' && (
        <>
          <h2 className="text-lg font-medium">
            Hello, {state.user.name ?? state.user.preferred_username ?? state.user.sub}
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {Object.entries(state.user).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="font-medium">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
          <Button variant="outline" onPress={() => void signOut()}>
            Log out
          </Button>
        </>
      )}
    </main>
  )
}

export default App
