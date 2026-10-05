import { Badge, Button } from '@opengovsg/oui'
import type { RowSelectionState } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { decide, listDepartments, listItems, type Outcome, type ReviewItem, type Task } from './api'
import { EditGroupsModal } from './EditGroupsModal'
import { OutcomeBadge } from './OutcomeBadge'
import { useRefetchOnFocus } from './use-refetch-on-focus'
import { notifyTaskSummaryChanged } from './use-task-summary'
import { formatDateTime } from '@/shared/lib/format'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList, type PageRequest } from '@/shared/lib/use-paged-list'
import { useResource } from '@/shared/lib/use-resource'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { DebouncedTextField } from '@/shared/ui/debounced-text-field'
import { FilterSelect } from '@/shared/ui/filter-select'
import { LoadError } from '@/shared/ui/load-error'
import { ReasonModal, type ReasonCode } from '@/shared/ui/reason-modal'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<ReviewItem>()

const OWN_ACCOUNT = 'You cannot review your own account.'

const OUTCOME_FILTERS: { id: Exclude<Outcome, 'removed'>; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'confirmed_groups_edited', label: 'Confirmed (Groups Edited)' },
]

/** What a dialog applies to: the ticked rows, or one row whose own button was pressed. */
type Pending = { kind: 'confirm' | 'remove'; item?: ReviewItem }

/** Group names as chips. */
function GroupChips({ groups }: { groups: string[] }) {
  if (groups.length === 0) return <span className="text-base-content-medium">None</span>
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Groups">
      {groups.map((name) => (
        <li key={name}>
          <Badge color="neutral">{name}</Badge>
        </li>
      ))}
    </ul>
  )
}

const lastLogin = (item: ReviewItem) =>
  item.lastLoginAt ? formatDateTime(item.lastLoginAt) : <span className="text-base-content-medium">Never</span>

/**
 * The active accounts of a task. Confirm and Remove apply to ticked rows (all or none) or to one row; Edit
 * Groups saves the full set and confirms the row in the same step. The rules the server enforces are mirrored
 * so the page never offers what would be refused: nothing on your own account, nothing on a decided row, and
 * nothing at all once the task is completed.
 */
export function ActiveAccounts({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const fetchPage = useCallback(
    ({ page, size, sort, search, filters }: PageRequest) => listItems(task.id, { page, size, sort, search, filters }),
    [task.id],
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
    retry,
    reset,
  } = usePagedList(fetchPage, { storageKey: `review-items:${task.id}` })
  const departments = useResource(listDepartments, [task.id])
  const [selection, setSelection] = useState<RowSelectionState>({})
  // Rows that dropped out of view by a new search or filter must not stay ticked, since Remove is permanent.
  // Adjusted during render, as React recommends for state derived from a change in state.
  const viewKey = JSON.stringify([search, filters])
  const [selectionViewKey, setSelectionViewKey] = useState(viewKey)
  if (viewKey !== selectionViewKey) {
    setSelectionViewKey(viewKey)
    setSelection({})
  }
  const [pending, setPending] = useState<Pending | null>(null)
  const [editing, setEditing] = useState<ReviewItem | null>(null)
  const decideMutation = useMutation(decide)

  const isOpen = task.status === 'open'
  const selectedIds = Object.keys(selection).filter((id) => selection[id])
  const ids = pending?.item ? [pending.item.id] : selectedIds

  const refresh = useCallback(() => {
    reload()
    onChanged()
    notifyTaskSummaryChanged()
  }, [reload, onChanged])
  useRefetchOnFocus(refresh)

  const closeDialog = () => {
    setPending(null)
    decideMutation.clearError()
  }

  // A refused batch (another reviewer got there first) leaves the dialog open with the server's message, and
  // the list behind it is read again so it shows who decided what.
  const submit = async (decision: 'confirm' | 'remove', reason?: { reasonCode: ReasonCode; note?: string }) => {
    const result = await decideMutation.run(task.id, { itemIds: ids, decision, ...reason })
    if (!result.ok) return reload()
    setPending(null)
    setSelection({})
    refresh()
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'User',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-sm text-base-content-medium">{row.original.username}</span>
          </div>
        ),
      }),
      columnHelper.accessor('department', {
        header: 'Department',
        cell: ({ getValue }) => getValue() || <span className="text-base-content-medium">None</span>,
      }),
      columnHelper.display({
        id: 'groups',
        header: 'Groups',
        cell: ({ row }) => <GroupChips groups={row.original.groups} />,
      }),
      columnHelper.accessor('lastLoginAt', { header: 'Last login', cell: ({ row }) => lastLogin(row.original) }),
      columnHelper.display({
        id: 'outcome',
        header: 'Status',
        cell: ({ row }) => <OutcomeBadge outcome={row.original.outcome} />,
      }),
      columnHelper.display({
        id: 'remark',
        header: 'Review details',
        cell: ({ row }) => row.original.remark ?? '',
      }),
      ...(isOpen
        ? [
            columnHelper.display({
              id: 'actions',
              header: 'Actions',
              cell: ({ row }) => <RowActions item={row.original} onDecide={setPending} onEdit={setEditing} />,
            }),
          ]
        : []),
    ],
    [isOpen],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  const count = ids.length
  const accounts = count === 1 ? 'account' : 'accounts'
  const departmentOptions =
    departments.status === 'loaded' ? departments.data.map((name) => ({ id: name, label: name })) : []

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchLabel="Search accounts"
        searchPlaceholder="Search by name, username or department"
      >
        <FilterSelect
          label="Department"
          value={filters.department}
          onChange={(value) => onFilterChange('department', value)}
          options={departmentOptions}
        />
        <DebouncedTextField
          label="Group"
          value={filters.group ?? ''}
          onCommit={(value) => onFilterChange('group', value)}
        />
        <FilterSelect
          label="Status"
          value={filters.outcome}
          onChange={(value) => onFilterChange('outcome', value)}
          options={OUTCOME_FILTERS}
          className="w-56"
        />
        <Button variant="clear" onPress={reset}>
          Reset
        </Button>
      </DataTableToolbar>
      {isOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <Button isDisabled={selectedIds.length === 0} onPress={() => setPending({ kind: 'confirm' })}>
            Confirm selected as reviewed ({selectedIds.length})
          </Button>
          <Button
            variant="outline"
            color="critical"
            isDisabled={selectedIds.length === 0}
            onPress={() => setPending({ kind: 'remove' })}
          >
            Remove selected ({selectedIds.length})
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
        rowSelection={isOpen ? selection : undefined}
        onRowSelectionChange={isOpen ? setSelection : undefined}
        canSelectRow={(item) => item.outcome === 'pending' && !item.ownAccount}
        mobileCard={(item) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-base-content-medium">
                  {item.username}
                  {item.department ? `, ${item.department}` : ''}
                </p>
              </div>
              <OutcomeBadge outcome={item.outcome} />
            </div>
            <GroupChips groups={item.groups} />
            <p className="text-sm text-base-content-medium">
              Last login: {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : 'Never'}
              {item.remark ? `. ${item.remark}` : ''}
            </p>
            {isOpen && <RowActions item={item} onDecide={setPending} onEdit={setEditing} />}
          </div>
        )}
        emptyMessage={
          search || Object.keys(filters).length > 0 ? 'No accounts match these filters.' : 'No active accounts.'
        }
      />
      <ConfirmModal
        isOpen={pending?.kind === 'confirm'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Confirm accounts"
        description={`Confirm that ${count} ${accounts} ${count === 1 ? 'is' : 'are'} correct and still needed? This is recorded in the audit trail.`}
        confirmLabel="Confirm"
        isCritical={false}
        isConfirming={decideMutation.isSubmitting}
        error={decideMutation.error?.message}
        onConfirm={() => submit('confirm')}
      />
      <ReasonModal
        isOpen={pending?.kind === 'remove'}
        onOpenChange={(open) => !open && closeDialog()}
        title="Remove accounts"
        description={`Permanently remove ${count} ${accounts}, with their group memberships and passkeys? This cannot be undone; only the audit trail is kept.`}
        confirmLabel="Remove"
        isCritical
        isConfirming={decideMutation.isSubmitting}
        error={decideMutation.error?.message}
        onConfirm={(reason) => submit('remove', reason)}
      />
      <EditGroupsModal
        item={editing}
        taskId={task.id}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}

/** Confirm, Edit Groups and Remove for a pending row; nothing for a decided one, and a reason on your own. */
function RowActions({
  item,
  onDecide,
  onEdit,
}: {
  item: ReviewItem
  onDecide: (pending: Pending) => void
  onEdit: (item: ReviewItem) => void
}) {
  if (item.outcome !== 'pending') return <span className="text-base-content-medium">None</span>
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        <Button
          variant="outline"
          size="sm"
          isDisabled={item.ownAccount}
          aria-label={`Confirm ${item.username}`}
          onPress={() => onDecide({ kind: 'confirm', item })}
        >
          Confirm
        </Button>
        <Button
          variant="outline"
          size="sm"
          isDisabled={item.ownAccount}
          aria-label={`Edit groups of ${item.username}`}
          onPress={() => onEdit(item)}
        >
          Edit Groups
        </Button>
        <Button
          variant="outline"
          color="critical"
          size="sm"
          isDisabled={item.ownAccount}
          aria-label={`Remove ${item.username}`}
          onPress={() => onDecide({ kind: 'remove', item })}
        >
          Remove
        </Button>
      </div>
      {item.ownAccount && <span className="text-xs text-base-content-medium">{OWN_ACCOUNT}</span>}
    </div>
  )
}
