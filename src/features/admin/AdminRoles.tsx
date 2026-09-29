import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useEffect, useMemo, useState } from 'react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { AdminApiError, createRole, deleteRole, listRoles, type AppRole } from './api'
import { useMutation } from '@/shared/lib/use-mutation'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, dataTableColumnHelper } from '@/shared/ui/data-table'

const PAGE_SIZE = 20

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

type RolesState =
  | { status: 'loading' }
  | { status: 'loaded'; items: AppRole[]; totalItems: number }
  | { status: 'error'; error: AdminApiError | Error }

export function AdminRoles() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [sorting, setSorting] = useState<SortingState>([])
  const [state, setState] = useState<RolesState>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<AppRole | null>(null)
  const deleteMutation = useMutation(deleteRole)

  const sort = useMemo(
    () => (sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined),
    [sorting],
  )

  useEffect(() => {
    let cancelled = false
    listRoles({ page: pagination.pageIndex, size: pagination.pageSize, sort }).then(
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <Button onPress={() => setIsCreateOpen(true)}>New role</Button>
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
        getRowId={(role) => role.id}
        emptyMessage="No roles found."
      />
      <CreateRoleModal
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => setReloadToken((t) => t + 1)}
      />
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
            setReloadToken((t) => t + 1)
          }
        }}
      />
    </section>
  )
}
