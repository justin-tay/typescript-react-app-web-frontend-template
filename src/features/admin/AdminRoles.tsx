import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useMemo, useState } from 'react'
import { AdminApiError, createRole, deleteRole, listRoles, type AppRole } from './api'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { PageHeader } from '@/shared/ui/page-header'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppRole>()

interface CreateRoleModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

function CreateRoleModal({ isOpen, onOpenChange, onCreated }: CreateRoleModalProps) {
  const [name, setName] = useState('')
  const { run, error, isSubmitting, clearError } = useMutation(createRole)

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) setName('')
        clearError()
        onOpenChange(open)
      }}
    >
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const result = await run({ name })
              if (result.ok) {
                onCreated()
                close()
              }
            }}
          >
            <ModalHeader>New role</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {error && !error.fieldErrors && <Infobox variant="error">{error.message}</Infobox>}
              <TextField
                label="Name"
                value={name}
                onChange={setName}
                isRequired
                errorMessage={error?.fieldErrors?.name}
                isInvalid={Boolean(error?.fieldErrors?.name)}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={isSubmitting}>
                Create
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}

export function AdminRoles() {
  const { state, pagination, onPaginationChange, sorting, onSortingChange, search, onSearchChange, reload } =
    usePagedList(listRoles, { storageKey: 'roles' })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<AppRole | null>(null)
  const deleteMutation = useMutation(deleteRole)

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button variant="clear" color="critical" onPress={() => setRoleToDelete(row.original)}>
            Delete
          </Button>
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
      <PageHeader
        title="Roles"
        subtitle="Manage the roles that groups can grant."
        actions={<Button onPress={() => setIsCreateOpen(true)}>New role</Button>}
      />
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search roles"
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
        mobileCard={(role) => (
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{role.name}</span>
            <Button variant="clear" color="critical" onPress={() => setRoleToDelete(role)}>
              Delete
            </Button>
          </div>
        )}
        getRowId={(role) => role.id}
        emptyMessage={search ? 'No roles match this search.' : 'No roles found.'}
      />
      <CreateRoleModal isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={() => reload()} />
      <ConfirmModal
        isOpen={roleToDelete !== null}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
        title="Delete role"
        description={`Delete the role "${roleToDelete?.name}"? This cannot be undone.`}
        isConfirming={deleteMutation.isSubmitting}
        error={deleteMutation.error?.message}
        onConfirm={async () => {
          if (!roleToDelete) return
          const result = await deleteMutation.run(roleToDelete.id)
          if (result.ok) {
            setRoleToDelete(null)
            reload()
          }
        }}
      />
    </section>
  )
}
