import { Link } from '@opengovsg/oui'
import { buttonStyles } from '@opengovsg/oui-theme'
import { ClipboardCheck, Eye } from 'lucide-react'
import { useMemo } from 'react'
import { listTasks, type Task } from './api'
import { dueHint } from './due'
import { ReviewProgress } from './ReviewProgress'
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

const TYPE_FILTERS = (['privileged_account_review', 'non_privileged_account_review'] as const).map((id) => ({
  id,
  label: humanize(id),
}))

const taskPeriod = (task: Task) => `${formatDate(task.startDate)} to ${formatDate(task.dueDate)}`
const taskTitle = (task: Task) => `${humanize(task.type)}, ${taskPeriod(task)}`

const DUE_TONE = {
  overdue: 'text-interaction-critical-default font-medium',
  soon: 'text-base-content-strong font-medium',
  later: 'text-base-content-medium',
}

/**
 * The same OUI button style as `ActionButton` (outline, small), on a link: it goes to the review, so it is not a
 * `Button`. `min-w-36` fits the widest label, "Start review", with its icon, so every row's button is one width.
 */
const ACTION_BUTTON = buttonStyles({
  variant: 'outline',
  size: 'sm',
  className: 'min-w-36 gap-1.5 hover:no-underline',
})

/** What the reviewer does next with this review. */
const taskAction = (task: Task) =>
  task.status === 'completed' ? 'View' : task.progress.reviewed > 0 ? 'Continue' : 'Start review'

/** The review tasks the reviewer can open, newest first. */
export function ReviewDashboard() {
  const { state, pagination, onPaginationChange, sorting, onSortingChange, filters, onFilterChange, retry, reset } =
    usePagedList(listTasks, { storageKey: 'review-tasks', initialFilters: { status: 'open' } })

  const columns = useMemo(
    () => [
      columnHelper.accessor('startDate', {
        header: 'Review',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link href={`/admin/reviews/${row.original.id}`} className="font-medium">
              {humanize(row.original.type)}
            </Link>
            <span className="text-base-content-medium">{taskPeriod(row.original)}</span>
          </div>
        ),
      }),
      columnHelper.display({
        id: 'progress',
        header: 'Reviewed',
        cell: ({ row }) => <ReviewProgress progress={row.original.progress} compact />,
      }),
      columnHelper.accessor('dueDate', {
        header: 'Due',
        cell: ({ row }) => {
          const hint = dueHint(row.original)
          return (
            <div className="flex flex-col">
              <span>{formatDate(row.original.dueDate)}</span>
              {hint && <span className={`text-sm ${DUE_TONE[hint.tone]}`}>{hint.text}</span>}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <TaskStatusBadge task={row.original} />,
      }),
      columnHelper.accessor('completedAt', {
        header: 'Completed',
        cell: ({ row }) =>
          row.original.completedAt ? (
            `${formatDateTime(row.original.completedAt)}${row.original.completedBy ? ` by ${row.original.completedBy}` : ''}`
          ) : (
            <span className="text-base-content-medium">—</span>
          ),
      }),
      columnHelper.display({
        id: 'action',
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          <Link
            href={`/admin/reviews/${row.original.id}`}
            aria-label={`${taskAction(row.original)}: ${taskTitle(row.original)}`}
            className={ACTION_BUTTON}
          >
            {row.original.status === 'completed' ? (
              <Eye aria-hidden className="size-4" />
            ) : (
              <ClipboardCheck aria-hidden className="size-4" />
            )}
            {taskAction(row.original)}
          </Link>
        ),
      }),
    ],
    [],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Account reviews"
        subtitle="Review who has an account: confirm it, take a role from it or remove it."
      />
      <div className="filter-row">
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
        hideFooterOnSinglePage
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
              {task.progress.reviewed} of {task.progress.total} reviewed, {task.counts.removed} removed
            </p>
          </div>
        )}
        emptyMessage={
          filters.status === 'open' && Object.keys(filters).length === 1
            ? 'No open reviews. A new one is created at the start of each review period.'
            : Object.keys(filters).length > 0
              ? 'No reviews match these filters.'
              : 'No reviews yet. One is created at the start of each review period.'
        }
      />
    </section>
  )
}
