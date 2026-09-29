import {
  Badge,
  Button,
  Infobox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  TextField,
  Toggle,
} from '@opengovsg/oui'
import { useEffect, useMemo, useState } from 'react'
import {
  AdminApiError,
  createUser,
  deleteUser,
  getGroup,
  listGroups,
  listUsers,
  updateUser,
  type AppUser,
  type UserStatus,
} from './api'
import { formatDateTime } from '@/shared/lib/format'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { DebouncedTextField } from '@/shared/ui/debounced-text-field'
import { RemoteComboBox, RemoteTagField, type RemoteOption, type SearchOptions } from '@/shared/ui/remote-picker'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppUser>()

/** Groups whose name matches what was typed, for the pickers. */
const searchGroups: SearchOptions = async ({ search, size }) => {
  const page = await listGroups({ page: 0, size, sort: ['name,asc'], search })
  return { items: page.items.map(({ id, name }) => ({ id, name })), totalItems: page.totalItems }
}

const STATUS_BADGE: Record<UserStatus, { color: 'success' | 'warning' | 'neutral'; label: string }> = {
  active: { color: 'success', label: 'Active' },
  pending: { color: 'warning', label: 'Pending' },
  disabled: { color: 'neutral', label: 'Disabled' },
}

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'disabled', label: 'Disabled' },
]

interface UserFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: AppUser | null
  onSaved: () => void
}

function UserFormModal({ isOpen, onOpenChange, user, onSaved }: UserFormModalProps) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [groups, setGroups] = useState<RemoteOption[]>([])
  const create = useMutation(createUser)
  const update = useMutation(
    (id: string, data: { name: string; email: string; enabled: boolean; groupIds: string[] }) =>
      updateUser(id, data),
  )
  const mutation = user ? update : create

  useEffect(() => {
    if (isOpen) {
      setUsername(user?.username ?? '')
      setName(user?.name ?? '')
      setEmail(user?.email ?? '')
      setEnabled(user?.enabled ?? true)
      setGroups(user?.groups ?? [])
      mutation.clearError()
    }
    // Only reset when the modal opens for a (possibly different) user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user])

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const data = { name, email, enabled, groupIds: groups.map((group) => group.id) }
              const result = user ? await update.run(user.id, data) : await create.run({ username, ...data })
              if (result.ok) {
                onSaved()
                close()
              }
            }}
          >
            <ModalHeader>{user ? `Edit ${user.username}` : 'New user'}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {mutation.error && !mutation.error.fieldErrors && (
                <Infobox variant="error">{mutation.error.message}</Infobox>
              )}
              {user ? (
                <TextField label="Username" value={username} isDisabled />
              ) : (
                <TextField
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  isRequired
                  description="Must match the user's Keycloak preferred_username, and cannot be changed later."
                  errorMessage={mutation.error?.fieldErrors?.username}
                  isInvalid={Boolean(mutation.error?.fieldErrors?.username)}
                />
              )}
              {user ? (
                <>
                  <TextField
                    label="Name"
                    value={name}
                    isDisabled
                    description="Comes from the identity provider; the admin console does not change it."
                  />
                  <TextField label="Email" value={email} isDisabled />
                </>
              ) : (
                <>
                  <TextField
                    label="Name"
                    value={name}
                    onChange={setName}
                    isRequired
                    description="A placeholder until the person first logs in through the identity provider."
                    errorMessage={mutation.error?.fieldErrors?.name}
                    isInvalid={Boolean(mutation.error?.fieldErrors?.name)}
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    isRequired
                    errorMessage={mutation.error?.fieldErrors?.email}
                    isInvalid={Boolean(mutation.error?.fieldErrors?.email)}
                  />
                </>
              )}
              <Toggle isSelected={enabled} onChange={setEnabled}>
                Enabled
              </Toggle>
              <RemoteTagField label="Groups" selected={groups} onChange={setGroups} searchOptions={searchGroups} />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={mutation.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={mutation.isSubmitting}>
                {user ? 'Save' : 'Create'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}

/**
 * The group the list is filtered by, with its name for the picker. Only the id is kept in
 * the table state, so after a refresh the name is fetched again.
 */
function useGroupFilterOption(groupId: string | undefined) {
  const [option, setOption] = useState<RemoteOption | null>(null)
  useEffect(() => {
    if (!groupId || option?.id === groupId) return
    let cancelled = false
    getGroup(groupId).then(
      ({ id, name }) => !cancelled && setOption({ id, name }),
      () => !cancelled && setOption({ id: groupId, name: groupId }),
    )
    return () => {
      cancelled = true
    }
  }, [groupId, option?.id])
  return { groupFilter: groupId && option?.id === groupId ? option : null, setGroupFilter: setOption }
}

export function AdminUsers() {
  const { state, pagination, onPaginationChange, sorting, onSortingChange, search, onSearchChange, filters, onFilterChange, reload } =
    usePagedList(listUsers, { storageKey: 'users' })
  const [showMoreFilters, setShowMoreFilters] = useState(
    Boolean(filters.email || filters.createdFrom || filters.createdTo),
  )
  const { groupFilter, setGroupFilter } = useGroupFilterOption(filters.groupId)
  const [editingUser, setEditingUser] = useState<AppUser | null | undefined>(undefined)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)
  const deleteMutation = useMutation(deleteUser)

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', { header: 'Username' }),
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.accessor('email', { header: 'Email', enableSorting: false }),
      columnHelper.display({
        id: 'groups',
        header: 'Groups',
        cell: ({ row }) => row.original.groups.map((group) => group.name).join(', '),
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const { color, label } = STATUS_BADGE[row.original.status]
          return <Badge color={color}>{label}</Badge>
        },
      }),
      columnHelper.accessor('lastLoginAt', {
        header: 'Last login',
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
            <Button variant="clear" onPress={() => setEditingUser(row.original)}>
              Edit
            </Button>
            <Button variant="clear" color="critical" onPress={() => setUserToDelete(row.original)}>
              Delete
            </Button>
          </div>
        ),
      }),
    ],
    [],
  )

  if (state.status === 'error') {
    const isForbidden = state.error instanceof AdminApiError && state.error.status === 403
    return <Infobox variant={isForbidden ? 'warning' : 'error'}>{state.error.message}</Infobox>
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onPress={() => setEditingUser(null)}>New user</Button>
      </div>
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search users"
        searchPlaceholder="Search by name, email or username"
      >
        <div className="w-40">
          <Select
            label="Status"
            value={filters.status ?? 'all'}
            onChange={(key) => onFilterChange('status', key === 'all' || key === null ? '' : String(key))}
          >
            {STATUS_FILTERS.map(({ id, label }) => (
              <SelectItem key={id} id={id}>
                {label}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="w-64">
          <RemoteComboBox
            label="Group"
            placeholder="All groups"
            selected={groupFilter}
            onChange={(group) => {
              setGroupFilter(group)
              onFilterChange('groupId', group?.id ?? '')
            }}
            searchOptions={searchGroups}
          />
        </div>
        <Button variant="outline" aria-expanded={showMoreFilters} onPress={() => setShowMoreFilters((open) => !open)}>
          More filters
        </Button>
      </DataTableToolbar>
      {showMoreFilters && (
        <div className="flex flex-wrap items-end gap-3">
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
        getRowId={(user) => user.id}
        emptyMessage={search || Object.keys(filters).length > 0 ? 'No users match these filters.' : 'No users found.'}
      />
      <UserFormModal
        isOpen={editingUser !== undefined}
        onOpenChange={(open) => !open && setEditingUser(undefined)}
        user={editingUser ?? null}
        onSaved={() => reload()}
      />
      <ConfirmModal
        isOpen={userToDelete !== null}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Delete user"
        description={`Delete the user "${userToDelete?.username}"? This cannot be undone.`}
        isConfirming={deleteMutation.isSubmitting}
        error={deleteMutation.error?.message}
        onConfirm={async () => {
          if (!userToDelete) return
          const result = await deleteMutation.run(userToDelete.id)
          if (result.ok) {
            setUserToDelete(null)
            reload()
          }
        }}
      />
    </section>
  )
}
