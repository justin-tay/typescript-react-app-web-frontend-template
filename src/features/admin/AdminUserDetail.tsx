import { Button, Infobox, Link, Spinner, Tab, TabList, TabPanel, Tabs } from '@opengovsg/oui'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { AdminApiError, getUser, type AppUser } from './api'
import { UserFormModal } from './UserFormModal'
import { UserStatusBadge } from './UserStatusBadge'
import { formatDateTime } from '@/shared/lib/format'
import { Card } from '@/shared/ui/card'
import { DescriptionList } from '@/shared/ui/description-list'
import { PageHeader } from '@/shared/ui/page-header'

type UserState = { status: 'loading' } | { status: 'loaded'; user: AppUser } | { status: 'error'; error: Error }

/** One user: their details and the groups they belong to. */
export function AdminUserDetail() {
  const { id = '' } = useParams()
  const [state, setState] = useState<UserState>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    let cancelled = false
    getUser(id).then(
      (user) => !cancelled && setState({ status: 'loaded', user }),
      (e: unknown) => !cancelled && setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) }),
    )
    return () => {
      cancelled = true
    }
  }, [id, reloadToken])

  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'error') {
    const { error } = state
    const status = error instanceof AdminApiError ? error.status : undefined
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="User" backLink={{ href: '/admin/users', label: 'Back to users' }} />
        <Infobox variant={status === 403 ? 'warning' : 'error'}>
          {status === 404 ? 'This user does not exist.' : error.message}
        </Infobox>
      </div>
    )
  }

  const { user } = state
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={user.name}
        badge={<UserStatusBadge status={user.status} />}
        subtitle={user.username}
        backLink={{ href: '/admin/users', label: 'Back to users' }}
        actions={
          <Button variant="outline" onPress={() => setIsEditing(true)}>
            Edit
          </Button>
        }
      />
      <Tabs>
        <TabList aria-label="User sections">
          <Tab id="details">Details</Tab>
          <Tab id="groups">Groups</Tab>
        </TabList>
        <TabPanel id="details" className="flex flex-col gap-4 pt-4">
          <Card title="Contact information">
            <DescriptionList
              items={[
                { label: 'Name', value: user.name },
                { label: 'Email', value: user.email || 'Not set' },
              ]}
            />
          </Card>
          <Card title="Account information">
            <DescriptionList
              items={[
                { label: 'Username', value: user.username },
                { label: 'Status', value: <UserStatusBadge status={user.status} /> },
                { label: 'Last login', value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never' },
                { label: 'Enabled', value: user.enabled ? 'Yes' : 'No' },
              ]}
            />
          </Card>
        </TabPanel>
        <TabPanel id="groups" className="pt-4">
          <Card title="Group memberships">
            {user.groups.length === 0 ? (
              <p className="text-base-content-medium">This user is not in any group.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {user.groups.map((group) => (
                  <li key={group.id}>
                    <Link href={`/admin/groups/${group.id}`}>{group.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabPanel>
      </Tabs>
      <UserFormModal isOpen={isEditing} onOpenChange={setIsEditing} user={user} onSaved={reload} />
    </section>
  )
}
