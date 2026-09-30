import { Button, Infobox, Link, Spinner, Tab, TabList, TabPanel, Tabs } from '@opengovsg/oui'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { AdminApiError, getGroup, listUsers, type AppGroup, type AppUser, type ListParams } from './api'
import { GroupFormModal } from './GroupFormModal'
import { UserStatusBadge } from './UserStatusBadge'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { Card } from '@/shared/ui/card'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { PageHeader } from '@/shared/ui/page-header'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppUser>()

const memberColumns = [
  columnHelper.accessor('username', {
    header: 'Username',
    cell: ({ row }) => <Link href={`/admin/users/${row.original.id}`}>{row.original.username}</Link>,
  }),
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.display({
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
  }),
  columnHelper.accessor('lastLoginAt', {
    header: 'Last sign-in',
    cell: ({ getValue }) => {
      const value = getValue()
      return value ? formatDateTime(value) : <span className="text-base-content-medium">Never</span>
    },
  }),
]

/** The users in one group, paged and searchable on the server like the main users list. */
function GroupMembers({ groupId }: { groupId: string }) {
  const fetchMembers = useMemo(
    () => (request: ListParams) => listUsers({ ...request, filters: { ...request.filters, groupId } }),
    [groupId],
  )
  const { state, pagination, onPaginationChange, sorting, onSortingChange, search, onSearchChange } = usePagedList(
    fetchMembers,
    { storageKey: `group-members:${groupId}` },
  )

  if (state.status === 'error') return <Infobox variant="error">{state.error.message}</Infobox>

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search members"
        searchPlaceholder="Search name, email, username"
      />
      <DataTable
        columns={memberColumns}
        data={state.status === 'loaded' ? state.items : []}
        rowCount={state.status === 'loaded' ? state.totalItems : 0}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        isLoading={state.status === 'loading'}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        getRowId={(user) => user.id}
        emptyMessage={search ? 'No members match this search.' : 'This group has no members.'}
      />
    </div>
  )
}

type GroupState = { status: 'loading' } | { status: 'loaded'; group: AppGroup } | { status: 'error'; error: Error }

/** One group: the roles it grants and the users in it. */
export function AdminGroupDetail() {
  const { id = '' } = useParams()
  const [state, setState] = useState<GroupState>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    let cancelled = false
    getGroup(id).then(
      (group) => !cancelled && setState({ status: 'loaded', group }),
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
        <PageHeader title="Group" backLink={{ href: '/admin/groups', label: 'Back to groups' }} />
        <Infobox variant={status === 403 ? 'warning' : 'error'}>
          {status === 404 ? 'This group does not exist.' : error.message}
        </Infobox>
      </div>
    )
  }

  const { group } = state
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={group.name}
        subtitle="The roles this group grants and the users in it."
        backLink={{ href: '/admin/groups', label: 'Back to groups' }}
        actions={
          <Button variant="outline" onPress={() => setIsEditing(true)}>
            Edit
          </Button>
        }
      />
      <Tabs>
        <TabList aria-label="Group sections">
          <Tab id="members">Members</Tab>
          <Tab id="roles">Roles</Tab>
        </TabList>
        <TabPanel id="members" className="pt-4">
          <GroupMembers groupId={group.id} />
        </TabPanel>
        <TabPanel id="roles" className="pt-4">
          <Card title="Roles granted">
            {group.roles.length === 0 ? (
              <p className="text-base-content-medium">This group grants no roles.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {group.roles.map((role) => (
                  <li key={role.id}>{role.name}</li>
                ))}
              </ul>
            )}
          </Card>
        </TabPanel>
      </Tabs>
      <GroupFormModal isOpen={isEditing} onOpenChange={setIsEditing} group={group} onSaved={reload} />
    </section>
  )
}
