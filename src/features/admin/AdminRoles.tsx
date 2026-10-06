import { Button, Link } from '@opengovsg/oui'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { deleteRole, listRoles, type AppRole } from './api'
import { RoleFormModal } from './RoleFormModal'
import { ROLES_TABLE } from './table-keys'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { ActionButton } from '@/shared/ui/action-button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { PermissionCount } from './PermissionCount'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppRole>()

export function AdminRoles() {
  const {
    state,
    pagination,
    onPaginationChange,
    sorting,
    onSortingChange,
    search,
    onSearchChange,
    reload,
    retry,
    reset,
  } = usePagedList(listRoles, { storageKey: ROLES_TABLE })
  const [editingRole, setEditingRole] = useState<AppRole | null | undefined>(undefined)
  const [roleToDelete, setRoleToDelete] = useState<AppRole | null>(null)
  const deleteMutation = useMutation(deleteRole)

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row }) => <Link href={`/admin/roles/${row.original.id}`}>{row.original.name}</Link>,
      }),
      columnHelper.display({
        id: 'permissions',
        header: 'Permissions',
        cell: ({ row }) => <PermissionCount permissions={row.original.permissions} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <ActionButton
              icon={Pencil}
              label={`Edit ${row.original.name}`}
              onPress={() => setEditingRole(row.original)}
            >
              Edit
            </ActionButton>
            <ActionButton
              icon={Trash2}
              color="critical"
              label={`Delete ${row.original.name}`}
              onPress={() => setRoleToDelete(row.original)}
            >
              Delete
            </ActionButton>
          </div>
        ),
      }),
    ],
    [],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Roles"
        subtitle="Manage roles and the permissions they grant."
        actions={<Button onPress={() => setEditingRole(null)}>New role</Button>}
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
          <div className="flex flex-col gap-2">
            <Link href={`/admin/roles/${role.id}`} className="touch-target font-medium">
              {role.name}
            </Link>
            <p className="text-sm text-base-content-medium">
              <PermissionCount permissions={role.permissions} />
            </p>
            <div className="relative flex gap-2">
              <ActionButton icon={Pencil} label={`Edit ${role.name}`} onPress={() => setEditingRole(role)}>
                Edit
              </ActionButton>
              <ActionButton
                icon={Trash2}
                color="critical"
                label={`Delete ${role.name}`}
                onPress={() => setRoleToDelete(role)}
              >
                Delete
              </ActionButton>
            </div>
          </div>
        )}
        getRowId={(role) => role.id}
        emptyMessage={search ? 'No roles match this search.' : 'No roles found.'}
      />
      <RoleFormModal
        isOpen={editingRole !== undefined}
        onOpenChange={(open) => !open && setEditingRole(undefined)}
        role={editingRole ?? null}
        onSaved={() => reload()}
      />
      <ConfirmModal
        isOpen={roleToDelete !== null}
        onOpenChange={(open) => {
          if (open) return
          setRoleToDelete(null)
          deleteMutation.clearError()
        }}
        title="Delete role"
        description={`Delete the role "${roleToDelete?.name}"? Members keep their account but lose this role's roles.`}
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
