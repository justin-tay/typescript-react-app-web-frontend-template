import { Avatar, Infobox, Spinner } from '@opengovsg/oui'
import { Navigate } from 'react-router'
import { useAuth } from '@/shared/session/auth-context'
import { initials, userName } from '@/shared/session/user'

const HEADLINE_KEYS = ['name', 'email']

/**
 * Personal info: a read-only view of the claims Keycloak issued at login. Editing a
 * person's name or email is "Delegated to Keycloak" in the backend's own terms (see its
 * CONTEXT.md): the application never implements it at all, not here and not from the
 * admin console, so there is deliberately no edit form and no link out to change it.
 */
export function AccountProfile() {
  const { state } = useAuth()

  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'error') return <Infobox variant="error">{state.message}</Infobox>
  if (state.status === 'anonymous') return <Navigate to="/login" replace />

  const { user } = state
  const details = Object.entries(user).filter(([key]) => !HEADLINE_KEYS.includes(key))
  return (
    <section className="flex max-w-xl flex-col gap-8">
      <div className="flex items-center gap-4">
        <Avatar.Root size="md">
          <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
        </Avatar.Root>
        <div>
          <h1 className="text-2xl font-semibold">{userName(user)}</h1>
          {user.email && <p className="text-base-content-medium">{user.email}</p>}
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
