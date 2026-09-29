import {
  Button,
  Infobox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  TextField,
} from '@opengovsg/oui'
import { useEffect, useMemo, useState } from 'react'
import {
  AdminApiError,
  createGroup,
  deleteGroup,
  listGroups,
  listRoles,
  updateGroup,
  type AppGroup,
} from './api'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { RemoteTagField, type RemoteOption, type SearchOptions } from '@/shared/ui/remote-picker'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppGroup>()

/** Roles whose name matches what was typed, for the picker. */
const searchRoles: SearchOptions = async ({ search, size }) => {
  const page = await listRoles({ page: 0, size, sort: ['name,asc'], search })
  return { items: page.items.map(({ id, name }) => ({ id, name })), totalItems: page.totalItems }
}

interface GroupFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  group: AppGroup | null
  onSaved: () => void
}

function GroupFormModal({ isOpen, onOpenChange, group, onSaved }: GroupFormModalProps) {
  const [name, setName] = useState('')
  const [roles, setRoles] = useState<RemoteOption[]>([])
  const create = useMutation(createGroup)
  const update = useMutation((id: string, data: { name: string; roleIds: string[] }) => updateGroup(id, data))
  const mutation = group ? update : create

  useEffect(() => {
    if (isOpen) {
      setName(group?.name ?? '')
      setRoles(group?.roles ?? [])
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
              const data = { name, roleIds: roles.map((role) => role.id) }
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
              <RemoteTagField label="Roles" selected={roles} onChange={setRoles} searchOptions={searchRoles} />
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

export function AdminGroups() {
  const { state, pagination, onPaginationChange, sorting, onSortingChange, search, onSearchChange, reload } =
    usePagedList(listGroups, { storageKey: 'groups' })
  const [editingGroup, setEditingGroup] = useState<AppGroup | null | undefined>(undefined)
  const [groupToDelete, setGroupToDelete] = useState<AppGroup | null>(null)
  const deleteMutation = useMutation(deleteGroup)

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
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search groups"
        searchPlaceholder="Search by name"
      />
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
        getRowId={(group) => group.id}
        emptyMessage={search ? 'No groups match this search.' : 'No groups found.'}
      />
      <GroupFormModal
        isOpen={editingGroup !== undefined}
        onOpenChange={(open) => !open && setEditingGroup(undefined)}
        group={editingGroup ?? null}
        onSaved={() => reload()}
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
            reload()
          }
        }}
      />
    </section>
  )
}
