import { Avatar, Infobox, Spinner } from '@opengovsg/oui'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { displayName, initials } from '../components/user'

const HEADLINE_KEYS = ['name', 'email', 'email_verified']

export function Profile() {
  const { state } = useAuth()

  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'error') return <Infobox variant="error">{state.message}</Infobox>
  if (state.status === 'anonymous') return <Navigate to="/" replace />

  const { user } = state
  const details = Object.entries(user).filter(([key]) => !HEADLINE_KEYS.includes(key))
  return (
    <section className="flex max-w-xl flex-col gap-8">
      <div className="flex items-center gap-4">
        <Avatar.Root size="md">
          <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
        </Avatar.Root>
        <div>
          <h1 className="text-2xl font-semibold">{displayName(user)}</h1>
          {user.email && (
            <p className="text-base-content-medium">
              {user.email}
              {user.email_verified === false && ' (not verified)'}
            </p>
          )}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium">Details</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 break-all">
          {details.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-medium">{key}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
