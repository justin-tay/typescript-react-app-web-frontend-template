import {
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
} from '@opengovsg/oui'
import { useEffect, useMemo, useState } from 'react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import {
  AdminApiError,
  createGroup,
  deleteGroup,
  listRoles,
  updateGroup,
  type AppGroup,
  type AppRole,
} from '../admin/api'
import { useAdminMutation } from '../admin/use-admin-mutation'
import { ConfirmModal } from '../ui/ConfirmModal'
import { dataTableColumnHelper } from '../ui/data-table-core'
import { DataTable } from '../ui/DataTable'
import { listGroups } from '../admin/api'

const PAGE_SIZE = 20

const columnHelper = dataTableColumnHelper<AppGroup>()

/** All roles, for the checklist a group's roles are picked from; the backend caps a page at 100. */
function useAllRoles() {
  const [roles, setRoles] = useState<AppRole[] | null>(null)
  useEffect(() => {
    let cancelled = false
    listRoles({ page: 0, size: 100, sort: 'name,asc' }).then(
      (result) => !cancelled && setRoles(result.items),
      () => !cancelled && setRoles([]),
    )
    return () => {
      cancelled = true
    }
  }, [])
  return roles
}

interface GroupFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  group: AppGroup | null
  onSaved: () => void
}

function GroupFormModal({ isOpen, onOpenChange, group, onSaved }: GroupFormModalProps) {
  const [name, setName] = useState('')
  const [roleIds, setRoleIds] = useState<string[]>([])
  const roles = useAllRoles()
  const create = useAdminMutation(createGroup)
  const update = useAdminMutation((id: string, data: { name: string; roleIds: string[] }) => updateGroup(id, data))
  const mutation = group ? update : create

  useEffect(() => {
    if (isOpen) {
      setName(group?.name ?? '')
      setRoleIds(group?.roles.map((role) => role.id) ?? [])
      mutation.clearError()
    }
    // Only reset when the modal opens for a (possibly different) group.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, group])

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const data = { name, roleIds }
              const result = group ? await update.run(group.id, data) : await create.run(data)
              if (result.ok) {
                onSaved()
                close()
              }
            }}
          >
            <ModalHeader>{group ? `Edit ${group.name}` : 'New group'}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {mutation.error && !mutation.error.fieldErrors && (
                <Infobox variant="error">{mutation.error.message}</Infobox>
              )}
              <TextField
                label="Name"
                value={name}
                onChange={setName}
                isRequired
                errorMessage={mutation.error?.fieldErrors?.name}
                isInvalid={Boolean(mutation.error?.fieldErrors?.name)}
              />
              <CheckboxGroup label="Roles" value={roleIds} onChange={setRoleIds}>
                <div className="flex flex-col gap-2">
                  {roles === null ? (
                    <p className="text-base-content-medium">Loading roles…</p>
                  ) : roles.length === 0 ? (
                    <p className="text-base-content-medium">No roles exist yet.</p>
                  ) : (
                    roles.map((role) => (
                      <Checkbox key={role.id} value={role.id}>
                        {role.name}
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
                {group ? 'Save' : 'Create'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}

type GroupsState =
  | { status: 'loading' }
  | { status: 'loaded'; items: AppGroup[]; totalItems: number }
  | { status: 'error'; error: AdminApiError | Error }

export function AdminGroups() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [sorting, setSorting] = useState<SortingState>([])
  const [state, setState] = useState<GroupsState>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const [editingGroup, setEditingGroup] = useState<AppGroup | null | undefined>(undefined)
  const [groupToDelete, setGroupToDelete] = useState<AppGroup | null>(null)
  const deleteMutation = useAdminMutation(deleteGroup)

  const sort = useMemo(
    () => (sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined),
    [sorting],
  )

  useEffect(() => {
    let cancelled = false
    listGroups({ page: pagination.pageIndex, size: pagination.pageSize, sort }).then(
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
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.display({
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => row.original.roles.map((role) => role.name).join(', '),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="clear" onPress={() => setEditingGroup(row.original)}>
              Edit
            </Button>
            <Button variant="clear" color="critical" onPress={() => setGroupToDelete(row.original)}>
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
        <h1 className="text-2xl font-semibold">Groups</h1>
        <Button onPress={() => setEditingGroup(null)}>New group</Button>
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
        getRowId={(group) => group.id}
        emptyMessage="No groups found."
      />
      <GroupFormModal
        isOpen={editingGroup !== undefined}
        onOpenChange={(open) => !open && setEditingGroup(undefined)}
        group={editingGroup ?? null}
        onSaved={() => setReloadToken((t) => t + 1)}
      />
      <ConfirmModal
        isOpen={groupToDelete !== null}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
        title="Delete group"
        description={`Delete the group "${groupToDelete?.name}"? Members keep their account but lose this group's roles.`}
        isConfirming={deleteMutation.isSubmitting}
        error={deleteMutation.error?.message}
        onConfirm={async () => {
          if (!groupToDelete) return
          const result = await deleteMutation.run(groupToDelete.id)
          if (result.ok) {
            setGroupToDelete(null)
            setReloadToken((t) => t + 1)
          }
        }}
      />
    </section>
  )
}
