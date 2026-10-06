import { Badge } from '@opengovsg/oui'
import { useCurrentUser } from '@/shared/session/auth-context'
import { permissionLabel, userName } from '@/shared/session/user'
import { Card } from '@/shared/ui/card'
import { DescriptionList } from '@/shared/ui/description-list'
import { PageHeader } from '@/shared/ui/page-header'

/**
 * Personal info: a read-only view of the details Keycloak issued at login. Editing a
 * person's name or email is "Delegated to Keycloak" in the backend's own terms (see its
 * CONTEXT.md): the application never implements it at all, not here and not from the
 * admin console, so there is deliberately no edit form and no link out to change it.
 */
export function AccountProfile() {
  const user = useCurrentUser()
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <PageHeader title="Personal info" subtitle="The details your organisation account provides." />
      <Card title="Profile">
        <DescriptionList
          items={[
            { label: 'Name', value: userName(user) },
            { label: 'Email', value: user.email ?? 'Not set' },
            { label: 'Username', value: user.username },
          ]}
        />
        <p className="text-sm text-base-content-medium">
          These come from your organisation's identity provider, so they can't be changed here.
        </p>
      </Card>
      <Card title="Your access">
        {user.permissions.length === 0 ? (
          <p className="text-base-content-medium">You have no administration permissions.</p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Your permissions">
            {user.permissions.map((permission) => (
              <li key={permission}>
                <Badge color="neutral">{permissionLabel(permission)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
