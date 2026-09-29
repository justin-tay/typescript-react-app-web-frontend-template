import { Infobox } from '@opengovsg/oui'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '@/shared/session/auth-context'
import { isAdmin } from '@/shared/session/user'

/**
 * Administration is for people who hold an administration role. Anyone else gets a plain
 * explanation here, instead of a page whose every request fails with a 403.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useCurrentUser()
  if (isAdmin(user)) return children
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-12">
      <Infobox variant="warning">You do not have access to administration.</Infobox>
      <Link to="/" className="text-base-content-brand underline">
        Back to my dashboard
      </Link>
    </div>
  )
}
