import { Badge } from '@opengovsg/oui'
import { useMemo } from 'react'
import { listPermissions, type AppPermission } from './api'
import { PERMISSIONS_TABLE } from './table-keys'
import { humanize } from '@/shared/lib/labels'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { FilterSelect } from '@/shared/ui/filter-select'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

const PAGE_SIZE_OPTIONS = [25, 50, 100]

const columnHelper = dataTableColumnHelper<AppPermission>()

const CLASS_FILTERS = [
  { id: 'true', label: 'Privileged' },
  { id: 'false', label: 'Not privileged' },
]

/** The seeded permissions, read-only: roles are what grant them. */
export function AdminPermissions() {
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
    retry,
    reset,
  } = usePagedList(listPermissions, { storageKey: PERMISSIONS_TABLE, pageSize: 50 })

  const columns = useMemo(
    () => [
      columnHelper.accessor('domain', { header: 'Domain', cell: ({ getValue }) => humanize(getValue()) }),
      columnHelper.accessor('action', { header: 'Action', cell: ({ getValue }) => humanize(getValue()) }),
      columnHelper.display({ id: 'name', header: 'Permission', cell: ({ row }) => row.original.name }),
      columnHelper.accessor('privileged', {
        header: 'Class',
        cell: ({ getValue }) =>
          getValue() ? <Badge color="critical">Privileged</Badge> : <Badge color="neutral">Not privileged</Badge>,
      }),
    ],
    [],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Permissions"
        subtitle="What a role can grant. Privileged permissions need the same permission to give, and cannot be held together with deciding account reviews."
      />
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search permissions"
        searchPlaceholder="Search by domain or action"
      >
        <FilterSelect
          label="Class"
          value={filters.privileged}
          onChange={(value) => onFilterChange('privileged', value)}
          options={CLASS_FILTERS}
          className="w-48"
        />
      </DataTableToolbar>
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
        getRowId={(permission) => permission.id}
        emptyMessage={
          search || Object.keys(filters).length > 0 ? 'No permissions match these filters.' : 'No permissions found.'
        }
      />
    </section>
  )
}
