import { Badge, Button, Infobox, Link, Spinner, Tab, TabList, TabPanel, Tabs } from '@opengovsg/oui'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasAnyPermission, hasPermission } from '@/shared/session/user'
import { getRole, listUsers, type AppUser, type ListParams, type PermissionSummary } from './api'
import { RoleFormModal } from './RoleFormModal'
import { UserStatusBadge } from './UserStatusBadge'
import { ApiError } from '@/shared/lib/api-errors'
import { formatDateTime } from '@/shared/lib/format'
import { humanize } from '@/shared/lib/labels'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { useResource } from '@/shared/lib/use-resource'
import { Card } from '@/shared/ui/card'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppUser>()

/** A role's permissions grouped by their domain (the part before the colon), in the order given. */
function byDomain(permissions: PermissionSummary[]) {
  const groups = new Map<string, PermissionSummary[]>()
  for (const permission of permissions) {
    const domain = permission.name.split(':')[0]
    groups.set(domain, [...(groups.get(domain) ?? []), permission])
  }
  return groups
}

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

/** The users in one role, paged and searchable on the server like the main users list. */
function RoleMembers({ roleId }: { roleId: string }) {
  const fetchMembers = useMemo(
    () => (request: ListParams) => listUsers({ ...request, filters: { ...request.filters, roleId } }),
    [roleId],
  )
  const { state, pagination, onPaginationChange, sorting, onSortingChange, search, onSearchChange, retry, reset } =
    usePagedList(fetchMembers, { storageKey: `role-members:${roleId}` })

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

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
        emptyMessage={search ? 'No members match this search.' : 'No user has this role.'}
      />
    </div>
  )
}

/** One role: the permissions it grants and the users who hold it. */
export function AdminRoleDetail() {
  const { id = '' } = useParams()
  const user = useCurrentUser()
  // Listing a role's holders is a users request, so it needs user:read, not only role:read.
  const canSeeMembers = hasPermission(user, 'user:read')
  const canEdit = hasAnyPermission(user, ['role:update', 'role:add-permission', 'role:remove-permission'])
  const state = useResource(getRole, [id])
  const { reload } = state
  const [isEditing, setIsEditing] = useState(false)

  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'error') {
    const { error } = state
    const status = error instanceof ApiError ? error.status : undefined
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Role" backLink={{ href: '/admin/roles', label: 'Back to roles' }} backLinkSmallOnly />
        <Infobox variant={status === 403 ? 'warning' : 'error'}>
          {status === 404 ? 'This role does not exist.' : error.message}
        </Infobox>
      </div>
    )
  }

  const { data: role } = state
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={role.name}
        subtitle="The permissions this role grants and the users who hold it."
        backLink={{ href: '/admin/roles', label: 'Back to roles' }}
        backLinkSmallOnly
        actions={
          canEdit && (
            <Button variant="outline" onPress={() => setIsEditing(true)}>
              Edit
            </Button>
          )
        }
      />
      <Tabs defaultSelectedKey={canSeeMembers ? 'members' : 'permissions'}>
        <TabList aria-label="Role sections">
          {canSeeMembers && <Tab id="members">Members</Tab>}
          <Tab id="permissions">Permissions</Tab>
        </TabList>
        {canSeeMembers && (
          <TabPanel id="members" className="pt-4">
            <RoleMembers roleId={role.id} />
          </TabPanel>
        )}
        <TabPanel id="permissions" className="pt-4">
          <Card title="Permissions granted">
            {role.permissions.length === 0 ? (
              <p className="text-base-content-medium">This role grants no permissions.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {[...byDomain(role.permissions)].map(([domain, permissions]) => (
                  <div key={domain}>
                    <h3 className="font-medium">{humanize(domain)}</h3>
                    <ul className="flex flex-col gap-1">
                      {permissions.map((permission) => (
                        <li key={permission.id} className="flex items-center gap-2">
                          {permission.name}
                          {permission.privileged && <Badge color="warning">Privileged</Badge>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabPanel>
      </Tabs>
      <RoleFormModal isOpen={isEditing} onOpenChange={setIsEditing} role={role} onSaved={reload} />
    </section>
  )
}
