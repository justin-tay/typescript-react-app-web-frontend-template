import { Button, Infobox, Select, SelectItem } from '@opengovsg/oui'
import type { RowSelectionState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { decide, listItems, suspendItem, unsuspendItem, type ReviewCategory, type ReviewItem, type Task } from './api'
import { ReviewStatusBadge } from './ReviewStatusBadge'
import { notifyTaskSummaryChanged } from './use-task-summary'
import { ApiError } from '@/shared/lib/api-errors'
import { formatDateTime } from '@/shared/lib/format'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList, type PageRequest } from '@/shared/lib/use-paged-list'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { ReasonModal, reasonLabel } from '@/shared/ui/reason-modal'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<ReviewItem>()

const OWN_ACCOUNT = 'You cannot act on your own account.'

type Pending =
  | { kind: 'verify' }
  | { kind: 'remove' }
  | { kind: 'suspend'; item: ReviewItem }
  | { kind: 'unsuspend'; item: ReviewItem }

const REVIEW_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending_verification', label: 'Pending verification' },
  { id: 'verified', label: 'Verified' },
]

const date = (value?: string) => (value ? formatDateTime(value) : '')

/**
 * One category of a task's accounts. Verify and Remove apply to the ticked rows and are all or
 * none; Suspend and Unsuspend act on a single row and leave its review status alone. The rules
 * the server enforces are mirrored here so the page never offers what would be refused: nothing
 * on your own account, nothing on a removed row, and no decisions once the task is completed.
 */
export function ReviewItemsTable({
  task,
  category,
  onChanged,
}: {
  task: Task
  category: ReviewCategory
  onChanged: () => void
}) {
  const fetchPage = useCallback(
    ({ page, size, sort, search, filters }: PageRequest) =>
      listItems(task.id, { category, page, size, sort, search, filters }),
    [task.id, category],
  )
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
    reload,
  } = usePagedList(fetchPage, { storageKey: `review-items:${task.id}:${category}` })
  const [selection, setSelection] = useState<RowSelectionState>({})
  const [pending, setPending] = useState<Pending | null>(null)
  const decideMutation = useMutation(decide)
  const suspend = useMutation(suspendItem)
  const unsuspend = useMutation(unsuspendItem)

  const canDecide = task.status !== 'completed' && category !== 'removed'
  const selectedIds = Object.keys(selection).filter((id) => selection[id])

  const finish = useCallback(() => {
    setPending(null)
    setSelection({})
    reload()
    onChanged()
    notifyTaskSummaryChanged()
  }, [reload, onChanged])

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', { header: 'Username' }),
      columnHelper.accessor('name', { header: 'Name' }),
      ...(category === 'active'
        ? [
            columnHelper.accessor('lastLoginAt', {
              header: 'Last sign-in',
              cell: ({ getValue }) => date(getValue()) || <span className="text-base-content-medium">Never</span>,
            }),
          ]
        : []),
      ...(category === 'suspended'
        ? [
            columnHelper.accessor('suspendedAt', { header: 'Suspended', cell: ({ getValue }) => date(getValue()) }),
            columnHelper.display({
              id: 'reason',
              header: 'Reason',
              cell: ({ row }) => reasonLabel(row.original.reasonCode, row.original.reasonNote),
            }),
          ]
        : []),
      ...(category === 'removed'
        ? [
            columnHelper.accessor('removedAt', {
              header: 'Removed',
              cell: ({ row }) =>
                `${date(row.original.removedAt)}${row.original.removedBy ? ` by ${row.original.removedBy}` : ''}`,
            }),
            columnHelper.display({
              id: 'reason',
              header: 'Reason',
              cell: ({ row }) => reasonLabel(row.original.reasonCode, row.original.reasonNote),
            }),
          ]
        : [
            columnHelper.display({
              id: 'reviewStatus',
              header: 'Review',
              cell: ({ row }) => <ReviewStatusBadge status={row.original.reviewStatus} />,
            }),
            columnHelper.display({
              id: 'actions',
              header: '',
              cell: ({ row }) => <RowAction item={row.original} onPress={setPending} />,
            }),
          ]),
    ],
    [category],
  )

  if (state.status === 'error') {
    const isForbidden = state.error instanceof ApiError && state.error.status === 403
    return <Infobox variant={isForbidden ? 'warning' : 'error'}>{state.error.message}</Infobox>
  }

  const count = selectedIds.length
  const accounts = count === 1 ? 'account' : 'accounts'

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search accounts"
        searchPlaceholder="Search username or name"
      >
        {category !== 'removed' && (
          <div className="w-52">
            <Select
              label="Review"
              value={filters.reviewStatus ?? 'all'}
              onChange={(key) => onFilterChange('reviewStatus', key === 'all' || key === null ? '' : String(key))}
            >
              {REVIEW_STATUS_FILTERS.map(({ id, label }) => (
                <SelectItem key={id} id={id}>
                  {label}
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
      </DataTableToolbar>
      {canDecide && (
        <div className="flex flex-wrap items-center gap-2">
          <Button isDisabled={count === 0} onPress={() => setPending({ kind: 'verify' })}>
            Verify selected ({count})
          </Button>
          <Button
            variant="outline"
            color="critical"
            isDisabled={count === 0}
            onPress={() => setPending({ kind: 'remove' })}
          >
            Remove selected ({count})
          </Button>
        </div>
      )}
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
        getRowId={(item) => item.id}
        rowSelection={canDecide ? selection : undefined}
        onRowSelectionChange={canDecide ? setSelection : undefined}
        canSelectRow={(item) => !item.ownAccount && item.reviewStatus === 'pending_verification'}
        mobileCard={(item) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-base-content-medium">{item.username}</p>
              </div>
              <ReviewStatusBadge status={item.reviewStatus} />
            </div>
            {category !== 'removed' && <RowAction item={item} onPress={setPending} />}
          </div>
        )}
        emptyMessage={
          search || Object.keys(filters).length > 0
            ? 'No accounts match these filters.'
            : 'No accounts in this category.'
        }
      />
      <ConfirmModal
        isOpen={pending?.kind === 'verify'}
        onOpenChange={(open) => !open && setPending(null)}
        title="Verify accounts"
        description={`Confirm that ${count} selected ${accounts} ${count === 1 ? 'is' : 'are'} correct and still needed? This is recorded in the audit trail.`}
        confirmLabel="Verify"
        isCritical={false}
        isConfirming={decideMutation.isSubmitting}
        error={decideMutation.error?.message}
        onConfirm={async () => {
          if ((await decideMutation.run(task.id, { itemIds: selectedIds, decision: 'verify' })).ok) finish()
        }}
      />
      <ReasonModal
        isOpen={pending?.kind === 'remove'}
        onOpenChange={(open) => !open && setPending(null)}
        title="Remove accounts"
        description={`Permanently remove ${count} selected ${accounts}, with their group memberships and passkeys? This cannot be undone; only the audit trail is kept.`}
        confirmLabel="Remove"
        isCritical
        isConfirming={decideMutation.isSubmitting}
        error={decideMutation.error?.message}
        onConfirm={async (reason) => {
          if ((await decideMutation.run(task.id, { itemIds: selectedIds, decision: 'remove', ...reason })).ok) finish()
        }}
      />
      <ReasonModal
        isOpen={pending?.kind === 'suspend'}
        onOpenChange={(open) => !open && setPending(null)}
        title="Suspend account"
        description={`Suspend "${pending?.kind === 'suspend' ? pending.item.username : ''}"? They are signed out and cannot sign in until unsuspended. It stays pending verification.`}
        confirmLabel="Suspend"
        isConfirming={suspend.isSubmitting}
        error={suspend.error?.message}
        onConfirm={async (reason) => {
          if (pending?.kind === 'suspend' && (await suspend.run(task.id, pending.item.id, reason)).ok) finish()
        }}
      />
      <ConfirmModal
        isOpen={pending?.kind === 'unsuspend'}
        onOpenChange={(open) => !open && setPending(null)}
        title="Unsuspend account"
        description={`Unsuspend "${pending?.kind === 'unsuspend' ? pending.item.username : ''}"? They can sign in again, and their inactivity period starts again from now.`}
        confirmLabel="Unsuspend"
        isCritical={false}
        isConfirming={unsuspend.isSubmitting}
        error={unsuspend.error?.message}
        onConfirm={async () => {
          if (pending?.kind === 'unsuspend' && (await unsuspend.run(task.id, pending.item.id)).ok) finish()
        }}
      />
    </div>
  )
}

/** Suspend, or Unsuspend for a suspended account; disabled, with the reason, on your own. */
function RowAction({ item, onPress }: { item: ReviewItem; onPress: (pending: Pending) => void }) {
  const isSuspended = item.category === 'suspended'
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="clear"
        isDisabled={item.ownAccount}
        onPress={() => onPress({ kind: isSuspended ? 'unsuspend' : 'suspend', item })}
      >
        {isSuspended ? 'Unsuspend' : 'Suspend'}
      </Button>
      {item.ownAccount && <span className="text-xs text-base-content-medium">{OWN_ACCOUNT}</span>}
    </div>
  )
}
