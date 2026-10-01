import { Button, Infobox, Link } from '@opengovsg/oui'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AdminApiError, deleteGroup, listGroups, type AppGroup } from './api'
import { GroupFormModal } from './GroupFormModal'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { IconButton } from '@/shared/ui/icon-button'
import { PageHeader } from '@/shared/ui/page-header'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AppGroup>()

export function AdminGroups() {
  const { state, pagination, onPaginationChange, sorting, onSortingChange, search, onSearchChange, reload } =
    usePagedList(listGroups, { storageKey: 'groups' })
  const [editingGroup, setEditingGroup] = useState<AppGroup | null | undefined>(undefined)
  const [groupToDelete, setGroupToDelete] = useState<AppGroup | null>(null)
  const deleteMutation = useMutation(deleteGroup)

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ row }) => <Link href={`/admin/groups/${row.original.id}`}>{row.original.name}</Link>,
      }),
      columnHelper.display({
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => row.original.roles.map((role) => role.displayName).join(', '),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              icon={Pencil}
              label={`Edit ${row.original.name}`}
              onPress={() => setEditingGroup(row.original)}
            />
            <IconButton
              icon={Trash2}
              color="critical"
              label={`Delete ${row.original.name}`}
              onPress={() => setGroupToDelete(row.original)}
            />
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
      <PageHeader
        title="Groups"
        subtitle="Manage groups and the roles they grant."
        actions={<Button onPress={() => setEditingGroup(null)}>New group</Button>}
      />
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
        mobileCard={(group) => (
          <div className="flex flex-col gap-2">
            <Link href={`/admin/groups/${group.id}`} className="font-medium">
              {group.name}
            </Link>
            {group.roles.length > 0 && (
              <p className="text-sm text-base-content-medium">
                {group.roles.map((role) => role.displayName).join(', ')}
              </p>
            )}
            <div className="flex gap-2">
              <IconButton icon={Pencil} label={`Edit ${group.name}`} onPress={() => setEditingGroup(group)} />
              <IconButton
                icon={Trash2}
                color="critical"
                label={`Delete ${group.name}`}
                onPress={() => setGroupToDelete(group)}
              />
            </div>
          </div>
        )}
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
