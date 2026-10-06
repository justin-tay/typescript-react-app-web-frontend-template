import { Badge, Button, Checkbox, Link, TextField } from '@opengovsg/oui'
import { Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getRole, listUsers, type AppUser } from './api'
import { UserLifecycleActions } from './UserLifecycleActions'
import { UserFormModal } from './UserFormModal'
import { UserStatusBadge } from './UserStatusBadge'
import { searchRoles } from './remote-options'
import { USERS_TABLE } from './table-keys'
import { formatDateTime } from '@/shared/lib/format'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasAnyPermission, hasPermission } from '@/shared/session/user'
import { ActionButton } from '@/shared/ui/action-button'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { DebouncedTextField } from '@/shared/ui/debounced-text-field'
import { FilterSelect } from '@/shared/ui/filter-select'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { RemoteComboBox, type RemoteOption } from '@/shared/ui/remote-picker'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppUser>()

const ACCESS_FILTERS: { id: string; label: string }[] = [
  { id: 'true', label: 'Privileged' },
  { id: 'false', label: 'Not privileged' },
]

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
]

/**
 * The role the list is filtered by, with its name for the picker. Only the id is kept in
 * the table state, so after a refresh the name is fetched again.
 */
function useRoleFilterOption(roleId: string | undefined) {
  const [option, setOption] = useState<RemoteOption | null>(null)
  useEffect(() => {
    if (!roleId || option?.id === roleId) return
    let cancelled = false
    getRole(roleId).then(
      ({ id, name }) => !cancelled && setOption({ id, name }),
      () => !cancelled && setOption({ id: roleId, name: roleId }),
    )
    return () => {
      cancelled = true
    }
  }, [roleId, option?.id])
  return { roleFilter: roleId && option?.id === roleId ? option : null, setRoleFilter: setOption }
}

export function AdminUsers() {
  const {
    state,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    search,
    onSearchChange,
    filters,
    onFilterChange,
    reload,
    retry,
    reset,
  } = usePagedList(listUsers, { storageKey: USERS_TABLE })
  const [showMoreFilters, setShowMoreFilters] = useState(
    Boolean(filters.email || filters.createdFrom || filters.createdTo),
  )
  const { roleFilter, setRoleFilter } = useRoleFilterOption(filters.roleId)
  const me = useCurrentUser()
  // Searching roles is a roles request, so the role filter is only offered with role:read.
  const canSeeRoles = hasPermission(me, 'role:read')
  const canCreate = hasPermission(me, 'user:create') && hasPermission(me, 'user:add-role')
  const canEdit = hasAnyPermission(me, ['user:update', 'user:add-role', 'user:remove-role'])
  const [editingUser, setEditingUser] = useState<AppUser | null | undefined>(undefined)

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', {
        header: 'Username',
        cell: ({ row }) => <Link href={`/admin/users/${row.original.id}`}>{row.original.username}</Link>,
      }),
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.accessor('email', { header: 'Email', enableSorting: false }),
      columnHelper.display({
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2">
            {row.original.roles.map((role) => role.name).join(', ')}
            {row.original.privileged && <Badge color="critical">Privileged</Badge>}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          return <UserStatusBadge status={row.original.status} />
        },
      }),
      columnHelper.accessor('lastLoginAt', {
        header: 'Last sign-in',
        cell: ({ getValue }) => {
          const value = getValue()
          return value ? formatDateTime(value) : <span className="text-base-content-medium">Never</span>
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2">
            {canEdit && (
              <ActionButton
                icon={Pencil}
                label={`Edit ${row.original.username}`}
                onPress={() => setEditingUser(row.original)}
              >
                Edit
              </ActionButton>
            )}
            <UserLifecycleActions variant="menu" user={row.original} onChanged={reload} />
          </div>
        ),
      }),
    ],
    [reload, canEdit],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        subtitle="Manage users and the roles they hold."
        actions={canCreate && <Button onPress={() => setEditingUser(null)}>New user</Button>}
      />
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search users"
        searchPlaceholder="Search name, email, username"
      >
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) => onFilterChange('status', value)}
          options={STATUS_FILTERS}
          className="w-40"
        />
        <Checkbox
          isSelected={filters.neverSignedIn === 'true'}
          onChange={(isSelected) => onFilterChange('neverSignedIn', isSelected ? 'true' : '')}
        >
          Never signed in
        </Checkbox>
        <FilterSelect
          label="Access"
          value={filters.privileged}
          onChange={(value) => onFilterChange('privileged', value)}
          options={ACCESS_FILTERS}
          className="w-44"
        />
        {canSeeRoles && (
          <div className="w-64">
            <RemoteComboBox
              label="Role"
              placeholder="All roles"
              selected={roleFilter}
              onChange={(role) => {
                setRoleFilter(role)
                onFilterChange('roleId', role?.id ?? '')
              }}
              searchOptions={searchRoles}
            />
          </div>
        )}
        <Button variant="outline" aria-expanded={showMoreFilters} onPress={() => setShowMoreFilters((open) => !open)}>
          More filters
        </Button>
      </DataTableToolbar>
      {showMoreFilters && (
        <div className="filter-row">
          <DebouncedTextField
            label="Email contains"
            value={filters.email ?? ''}
            onCommit={(value) => onFilterChange('email', value)}
          />
          <TextField
            label="Created from"
            type="date"
            value={filters.createdFrom ?? ''}
            onChange={(value) => onFilterChange('createdFrom', value)}
          />
          <TextField
            label="Created to"
            type="date"
            value={filters.createdTo ?? ''}
            onChange={(value) => onFilterChange('createdTo', value)}
          />
        </div>
      )}
      <DataTable
        columns={columns}
        data={state.status === 'loaded' ? state.items : []}
        rowCount={state.status === 'loaded' ? state.totalItems : 0}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        isLoading={state.status === 'loading'}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        mobileCard={(user) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/admin/users/${user.id}`} className="touch-target font-medium">
                  {user.name}
                </Link>
                <p className="text-sm text-base-content-medium">{user.username}</p>
              </div>
              <UserStatusBadge status={user.status} />
            </div>
            {user.roles.length > 0 && (
              <p className="text-sm">
                {user.roles.map((role) => role.name).join(', ')}
                {user.privileged && ' (privileged)'}
              </p>
            )}
            <p className="text-sm text-base-content-medium">
              Last sign-in: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
            </p>
            <div className="relative flex gap-2">
              {canEdit && (
                <ActionButton icon={Pencil} label={`Edit ${user.username}`} onPress={() => setEditingUser(user)}>
                  Edit
                </ActionButton>
              )}
              <UserLifecycleActions variant="menu" user={user} onChanged={reload} />
            </div>
          </div>
        )}
        getRowId={(user) => user.id}
        emptyMessage={search || Object.keys(filters).length > 0 ? 'No users match these filters.' : 'No users found.'}
      />
      <UserFormModal
        isOpen={editingUser !== undefined}
        onOpenChange={(open) => !open && setEditingUser(undefined)}
        user={editingUser ?? null}
        onReopen={setEditingUser}
        onSaved={() => reload()}
      />
    </section>
  )
}
