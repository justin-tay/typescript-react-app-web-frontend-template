import {
  Badge,
  Button,
  Checkbox,
  CheckboxGroup,
  Infobox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  TextField,
  Toggle,
} from '@opengovsg/oui'
import { useEffect, useMemo, useState } from 'react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import {
  AdminApiError,
  createUser,
  deleteUser,
  listGroups,
  listUsers,
  updateUser,
  type AppGroup,
  type AppUser,
} from '../admin/api'
import { useMutation } from '../lib/use-mutation'
import { ConfirmModal } from '../ui/ConfirmModal'
import { dataTableColumnHelper } from '../ui/data-table-core'
import { DataTable } from '../ui/DataTable'

const PAGE_SIZE = 20

const columnHelper = dataTableColumnHelper<AppUser>()

/** All groups, for the checklist a user's groups are picked from; the backend caps a page at 100. */
function useAllGroups() {
  const [groups, setGroups] = useState<AppGroup[] | null>(null)
  useEffect(() => {
    let cancelled = false
    listGroups({ page: 0, size: 100, sort: 'name,asc' }).then(
      (result) => !cancelled && setGroups(result.items),
      () => !cancelled && setGroups([]),
    )
    return () => {
      cancelled = true
    }
  }, [])
  return groups
}

interface UserFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: AppUser | null
  onSaved: () => void
}

function UserFormModal({ isOpen, onOpenChange, user, onSaved }: UserFormModalProps) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [groupIds, setGroupIds] = useState<string[]>([])
  const groups = useAllGroups()
  const create = useMutation(createUser)
  const update = useMutation(
    (id: string, data: { displayName: string; email: string; enabled: boolean; groupIds: string[] }) =>
      updateUser(id, data),
  )
  const mutation = user ? update : create

  useEffect(() => {
    if (isOpen) {
      setUsername(user?.username ?? '')
      setDisplayName(user?.displayName ?? '')
      setEmail(user?.email ?? '')
      setEnabled(user?.enabled ?? true)
      setGroupIds(user?.groups.map((group) => group.id) ?? [])
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
              const data = { displayName, email, enabled, groupIds }
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
                    label="Display name"
                    value={displayName}
                    isDisabled
                    description="Comes from the identity provider; the admin console does not change it."
                  />
                  <TextField label="Email" value={email} isDisabled />
                </>
              ) : (
                <>
                  <TextField
                    label="Display name"
                    value={displayName}
                    onChange={setDisplayName}
                    isRequired
                    description="A placeholder until the person first logs in through the identity provider."
                    errorMessage={mutation.error?.fieldErrors?.displayName}
                    isInvalid={Boolean(mutation.error?.fieldErrors?.displayName)}
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
              <CheckboxGroup label="Groups" value={groupIds} onChange={setGroupIds}>
                <div className="flex flex-col gap-2">
                  {groups === null ? (
                    <p className="text-base-content-medium">Loading groups…</p>
                  ) : groups.length === 0 ? (
                    <p className="text-base-content-medium">No groups exist yet.</p>
                  ) : (
                    groups.map((group) => (
                      <Checkbox key={group.id} value={group.id}>
                        {group.name}
                      </Checkbox>
                    ))
                  )}
                </div>
              </CheckboxGroup>
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

type UsersState =
  | { status: 'loading' }
  | { status: 'loaded'; items: AppUser[]; totalItems: number }
  | { status: 'error'; error: AdminApiError | Error }

export function AdminUsers() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [sorting, setSorting] = useState<SortingState>([])
  const [state, setState] = useState<UsersState>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const [editingUser, setEditingUser] = useState<AppUser | null | undefined>(undefined)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)
  const deleteMutation = useMutation(deleteUser)

  const sort = useMemo(
    () => (sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined),
    [sorting],
  )

  useEffect(() => {
    let cancelled = false
    listUsers({ page: pagination.pageIndex, size: pagination.pageSize, sort }).then(
      (result) => {
        if (!cancelled) setState({ status: 'loaded', items: result.items, totalItems: result.totalItems })
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [pagination.pageIndex, pagination.pageSize, sort, reloadToken])

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', { header: 'Username' }),
      columnHelper.accessor('displayName', { header: 'Display name' }),
      columnHelper.accessor('email', { header: 'Email', enableSorting: false }),
      columnHelper.display({
        id: 'groups',
        header: 'Groups',
        cell: ({ row }) => row.original.groups.map((group) => group.name).join(', '),
      }),
      columnHelper.display({
        id: 'enabled',
        header: 'Status',
        cell: ({ row }) => (
          <Badge color={row.original.enabled ? 'success' : 'critical'}>
            {row.original.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        ),
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
      <DataTable
        columns={columns}
        data={state.status === 'loaded' ? state.items : []}
        rowCount={state.status === 'loaded' ? state.totalItems : 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={state.status === 'loading'}
        getRowId={(user) => user.id}
        emptyMessage="No users found."
      />
      <UserFormModal
        isOpen={editingUser !== undefined}
        onOpenChange={(open) => !open && setEditingUser(undefined)}
        user={editingUser ?? null}
        onSaved={() => setReloadToken((t) => t + 1)}
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
            setReloadToken((t) => t + 1)
          }
        }}
      />
    </section>
  )
}
