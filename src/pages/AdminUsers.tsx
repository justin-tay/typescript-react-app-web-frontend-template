import { Badge, Infobox } from '@opengovsg/oui'
import { useEffect, useMemo, useState } from 'react'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { AdminApiError, listUsers, type AppUser } from '../admin/api'
import { dataTableColumnHelper } from '../ui/data-table-core'
import { DataTable } from '../ui/DataTable'

const PAGE_SIZE = 20

const columnHelper = dataTableColumnHelper<AppUser>()

const columns = [
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
]

type UsersState =
  | { status: 'loading' }
  | { status: 'loaded'; items: AppUser[]; totalItems: number }
  | { status: 'error'; error: AdminApiError | Error }

export function AdminUsers() {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const [sorting, setSorting] = useState<SortingState>([])
  const [state, setState] = useState<UsersState>({ status: 'loading' })

  const sort = useMemo(
    () => (sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined),
    [sorting],
  )

  useEffect(() => {
    let cancelled = false
    listUsers({ page: pagination.pageIndex, size: pagination.pageSize, sort }).then(
      (result) => {
        if (!cancelled) {
          setState({ status: 'loaded', items: result.items, totalItems: result.totalItems })
        }
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [pagination.pageIndex, pagination.pageSize, sort])

  if (state.status === 'error') {
    const isForbidden = state.error instanceof AdminApiError && state.error.status === 403
    return <Infobox variant={isForbidden ? 'warning' : 'error'}>{state.error.message}</Infobox>
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Users</h1>
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
    </section>
  )
}
