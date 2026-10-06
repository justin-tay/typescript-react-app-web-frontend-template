import { Badge, Button, Infobox, Link, Spinner, Tab, TabList, TabPanel, Tabs } from '@opengovsg/oui'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasAnyPermission } from '@/shared/session/user'
import { getUser } from './api'
import { UserLifecycleActions } from './UserLifecycleActions'
import { UserFormModal } from './UserFormModal'
import { UserStatusBadge } from './UserStatusBadge'
import { ApiError } from '@/shared/lib/api-errors'
import { formatDateTime } from '@/shared/lib/format'
import { inactiveDays } from '@/shared/lib/inactivity'
import { useResource } from '@/shared/lib/use-resource'
import { Card } from '@/shared/ui/card'
import { DescriptionList } from '@/shared/ui/description-list'
import { PageHeader } from '@/shared/ui/page-header'
import { reasonLabel } from '@/shared/ui/reason-modal'

/** One user: their details and the roles they hold. */
export function AdminUserDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const canEdit = hasAnyPermission(useCurrentUser(), ['user:update', 'user:add-role', 'user:remove-role'])
  const state = useResource(getUser, [id])
  const { reload } = state
  const [isEditing, setIsEditing] = useState(false)

  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'error') {
    const { error } = state
    const status = error instanceof ApiError ? error.status : undefined
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="User" backLink={{ href: '/admin/users', label: 'Back to users' }} backLinkSmallOnly />
        <Infobox variant={status === 403 ? 'warning' : 'error'}>
          {status === 404 ? 'This user does not exist.' : error.message}
        </Infobox>
      </div>
    )
  }

  const { data: user } = state
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={user.name}
        badge={<UserStatusBadge status={user.status} />}
        subtitle={user.username}
        backLink={{ href: '/admin/users', label: 'Back to users' }}
        backLinkSmallOnly
        actions={
          <div className="flex gap-2">
            <UserLifecycleActions
              variant="text"
              user={user}
              onChanged={reload}
              onRemoved={() => navigate('/admin/users')}
            />
            {canEdit && (
              <Button variant="outline" onPress={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        }
      />
      <Tabs>
        <TabList aria-label="User sections">
          <Tab id="details">Details</Tab>
          <Tab id="roles">Roles</Tab>
        </TabList>
        <TabPanel id="details" className="flex flex-col gap-4 pt-4">
          <Card title="Contact information">
            <DescriptionList
              items={[
                { label: 'Name', value: user.name },
                { label: 'Email', value: user.email || 'Not set' },
                { label: 'Department', value: user.department || 'Not set' },
              ]}
            />
          </Card>
          <Card title="Account information">
            <DescriptionList
              items={[
                { label: 'Username', value: user.username },
                { label: 'Status', value: <UserStatusBadge status={user.status} /> },
                {
                  label: 'Access',
                  value: user.privileged ? <Badge color="critical">Privileged</Badge> : 'Not privileged',
                },
                { label: 'Last sign-in', value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never' },
                {
                  label: 'Inactive for',
                  value: (() => {
                    const days = inactiveDays(user, new Date())
                    return days === null ? 'Unknown' : `${days.toLocaleString()} ${days === 1 ? 'day' : 'days'}`
                  })(),
                },
                { label: 'Account created', value: formatDateTime(user.createdAt) },
                ...(user.status === 'suspended'
                  ? [
                      { label: 'Suspended', value: user.suspendedAt ? formatDateTime(user.suspendedAt) : 'Yes' },
                      {
                        label: 'Suspension reason',
                        value: reasonLabel(user.suspensionReasonCode, user.suspensionNote),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </TabPanel>
        <TabPanel id="roles" className="pt-4">
          <Card title="Roles held">
            {user.roles.length === 0 ? (
              <p className="text-base-content-medium">This user holds no role.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {user.roles.map((role) => (
                  <li key={role.id}>
                    <Link href={`/admin/roles/${role.id}`}>{role.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabPanel>
      </Tabs>
      <UserFormModal
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        user={user}
        onReopen={() => setIsEditing(true)}
        onSaved={reload}
      />
    </section>
  )
}
