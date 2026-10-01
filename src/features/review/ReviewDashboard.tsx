import { Link } from '@opengovsg/oui'
import { useMemo } from 'react'
import { listTasks, type Task } from './api'
import { TaskStatusBadge } from './TaskStatusBadge'
import { formatDate, formatDateTime } from '@/shared/lib/format'
import { humanize } from '@/shared/lib/labels'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { DataTable, dataTableColumnHelper } from '@/shared/ui/data-table'
import { LoadError } from '@/shared/ui/load-error'
import { FilterSelect } from '@/shared/ui/filter-select'
import { PageHeader } from '@/shared/ui/page-header'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

const columnHelper = dataTableColumnHelper<Task>()

const STATUS_FILTERS = [
  { id: 'open', label: 'Open' },
  { id: 'completed', label: 'Completed' },
]

const TYPE_FILTERS = [{ id: 'account_review', label: humanize('account_review') }]

const taskTitle = (task: Task) => `${humanize(task.type)}, ${formatDate(task.startDate)} to ${formatDate(task.dueDate)}`

/** The review tasks the reviewer can open, newest first. */
export function ReviewDashboard() {
  const { state, pagination, onPaginationChange, sorting, onSortingChange, filters, onFilterChange, retry, reset } =
    usePagedList(listTasks, { storageKey: 'review-tasks' })

  const columns = useMemo(
    () => [
      columnHelper.accessor('startDate', {
        header: 'Review',
        cell: ({ row }) => <Link href={`/admin/reviews/${row.original.id}`}>{taskTitle(row.original)}</Link>,
      }),
      columnHelper.accessor('dueDate', { header: 'Due', cell: ({ getValue }) => formatDate(getValue()) }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <TaskStatusBadge task={row.original} />,
      }),
      columnHelper.display({
        id: 'toVerify',
        header: 'To verify',
        cell: ({ row }) => row.original.counts.pending_verification ?? 0,
      }),
      columnHelper.display({
        id: 'verified',
        header: 'Verified',
        cell: ({ row }) => row.original.counts.verified ?? 0,
      }),
      columnHelper.display({ id: 'removed', header: 'Removed', cell: ({ row }) => row.original.counts.removed ?? 0 }),
      columnHelper.accessor('completedAt', {
        header: 'Completed',
        cell: ({ row }) =>
          row.original.completedAt ? (
            `${formatDateTime(row.original.completedAt)}${row.original.completedBy ? ` by ${row.original.completedBy}` : ''}`
          ) : (
            <span className="text-base-content-medium">Not yet</span>
          ),
      }),
    ],
    [],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Account reviews" subtitle="Review who has an account, and verify or remove it." />
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(value) => onFilterChange('status', value)}
          options={STATUS_FILTERS}
          className="w-44"
        />
        <FilterSelect
          label="Type"
          value={filters.type}
          onChange={(value) => onFilterChange('type', value)}
          options={TYPE_FILTERS}
          className="w-44"
        />
      </div>
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
        getRowId={(task) => task.id}
        mobileCard={(task) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/admin/reviews/${task.id}`} className="touch-target font-medium">
                {taskTitle(task)}
              </Link>
              <TaskStatusBadge task={task} />
            </div>
            <p className="text-sm text-base-content-medium">
              {task.counts.pending_verification ?? 0} to verify, {task.counts.verified ?? 0} verified,{' '}
              {task.counts.removed ?? 0} removed
            </p>
          </div>
        )}
        emptyMessage={
          Object.keys(filters).length > 0
            ? 'No reviews match these filters.'
            : 'No reviews yet. One is created at the start of each review period.'
        }
      />
    </section>
  )
}
