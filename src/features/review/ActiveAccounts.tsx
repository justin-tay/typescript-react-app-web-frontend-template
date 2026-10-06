import { Badge, Button } from '@opengovsg/oui'
import type { RowSelectionState } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { decide, listDepartments, listItems, type Outcome, type ReviewItem, type Task } from './api'
import { EditRolesModal } from './EditRolesModal'
import { inactiveDays } from '@/shared/lib/inactivity'
import { DaysInactive, LastLogin } from './InactivityCells'
import { OutcomeBadge } from './OutcomeBadge'
import { UserCard } from './UserCard'
import { useRefetchOnFocus } from './use-refetch-on-focus'
import { notifyTaskSummaryChanged } from './use-task-summary'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList, type PageRequest } from '@/shared/lib/use-paged-list'
import { useResource } from '@/shared/lib/use-resource'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasPermission } from '@/shared/session/user'
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
  { id: 'pending', label: 'Not reviewed' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'confirmed_roles_edited', label: 'Confirmed (Roles Edited)' },
]

/** What a dialog applies to: Confirm the ticked rows, or Remove the one row whose button was pressed. */
type Pending = { kind: 'confirm' } | { kind: 'remove'; item: ReviewItem }

/** Names as chips, with the accessible name of the list. */
function Chips({ names, label }: { names: string[]; label: string }) {
  if (names.length === 0) return <span className="text-base-content-medium">None</span>
  return (
    <ul className="flex flex-wrap gap-1" aria-label={label}>
      {names.map((name) => (
        <li key={name}>
          <Badge color="neutral">{name}</Badge>
        </li>
      ))}
    </ul>
  )
}

/** The server's refusal of a batch lists ids a reviewer cannot read, so it is introduced in plain words. */
const conflictMessage = (message?: string) =>
  message && /already|not in|decided/i.test(message)
    ? `Someone else may have reviewed these accounts already. ${message}`
    : message

/**
 * The active accounts of a task. Tick the accounts that are correct and confirm them together (all or none); Edit
 * Roles saves the roles to keep (a reviewer can only take roles away) and confirms the row in the same step, and
 * Remove acts on one row. The rules the server
 * enforces are mirrored so the page never offers what would be refused: nothing on your own account, nothing on a
 * reviewed row, and nothing at all once the task is completed.
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
  // Rows that dropped out of view by a new search or filter must not stay ticked. Adjusted during render, as React
  // recommends for state derived from a change in state.
  const viewKey = JSON.stringify([search, filters])
  const [selectionViewKey, setSelectionViewKey] = useState(viewKey)
  if (viewKey !== selectionViewKey) {
    setSelectionViewKey(viewKey)
    setSelection({})
  }
  const [pending, setPending] = useState<Pending | null>(null)
  const [editing, setEditing] = useState<ReviewItem | null>(null)
  const decideMutation = useMutation(decide)
  const user = useCurrentUser()
  // Deciding needs review:decide; taking a role away also needs user:remove-role and removing an account user:remove.
  const canDecide = hasPermission(user, 'review:decide')
  const canEditRoles = canDecide && hasPermission(user, 'user:remove-role')
  const canRemove = canDecide && hasPermission(user, 'user:remove')

  const isOpen = task.status === 'open' && canDecide
  const selectedIds = Object.keys(selection).filter((id) => selection[id])
  const removing = pending?.kind === 'remove' ? pending.item : null

  const refresh = useCallback(() => {
    reload()
    onChanged()
    notifyTaskSummaryChanged()
  }, [reload, onChanged])
  useRefetchOnFocus(reload)

  const closeDialog = () => {
    setPending(null)
    decideMutation.clearError()
  }

  // A refused batch (another reviewer got there first) leaves the dialog open with the server's message, and
  // the list behind it is read again so it shows who decided what.
  const submit = async (
    itemIds: string[],
    decision: 'confirm' | 'remove',
    reason?: { reasonCode: ReasonCode; note?: string },
  ) => {
    const result = await decideMutation.run(task.id, { itemIds, decision, ...reason })
    if (!result.ok) return reload()
    setPending(null)
    setSelection({})
    refresh()
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'User',
        cell: ({ row }) => <UserCard name={row.original.name} username={row.original.username} />,
      }),
      columnHelper.accessor('department', {
        header: 'Department',
        cell: ({ getValue }) => getValue() || <span className="text-base-content-medium">None</span>,
      }),
      columnHelper.display({
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) => <Chips names={row.original.roles} label="Roles" />,
      }),
      columnHelper.accessor('lastLoginAt', {
        header: 'Last login',
        cell: ({ row }) => <LastLogin lastLoginAt={row.original.lastLoginAt} />,
      }),
      columnHelper.display({
        id: 'inactiveDays',
        header: 'Days inactive',
        cell: ({ row }) => (
          <DaysInactive
            lastActivityAt={row.original.lastActivityAt}
            endedAt={row.original.decidedAt}
            endedLabel="at review"
          />
        ),
      }),
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
              cell: ({ row }) => (
                <RowActions
                  item={row.original}
                  canEditRoles={canEditRoles}
                  canRemove={canRemove}
                  onRemove={(item) => setPending({ kind: 'remove', item })}
                  onEdit={setEditing}
                />
              ),
            }),
          ]
        : []),
    ],
    [isOpen, canEditRoles, canRemove],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  const count = selectedIds.length
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
          label="Role"
          value={filters.role ?? ''}
          onCommit={(value) => onFilterChange('role', value)}
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
        <div className="flex flex-wrap items-center gap-3">
          <Button isDisabled={count === 0} onPress={() => setPending({ kind: 'confirm' })}>
            Confirm selected as reviewed
          </Button>
          <p className="text-sm text-base-content-medium" aria-live="polite">
            {count === 0 ? 'Select accounts to confirm them' : `${count} ${accounts} selected`}
          </p>
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
        mobileCard={(item) => {
          const days = inactiveDays({ lastActivityAt: item.lastActivityAt, endedAt: item.decidedAt }, new Date())
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <UserCard name={item.name} username={item.username} department={item.department} />
                <OutcomeBadge outcome={item.outcome} />
              </div>
              <Chips names={item.roles} label="Roles" />
              <p className="text-sm">
                Last login: <LastLogin lastLoginAt={item.lastLoginAt} />
                {days !== null &&
                  ` (${days.toLocaleString()} ${days === 1 ? 'day' : 'days'} inactive${item.decidedAt ? ' at review' : ''})`}
              </p>
              {item.remark && <p className="text-sm text-base-content-medium">{item.remark}</p>}
              {isOpen && (
                <RowActions
                  item={item}
                  canEditRoles={canEditRoles}
                  canRemove={canRemove}
                  onRemove={(row) => setPending({ kind: 'remove', item: row })}
                  onEdit={setEditing}
                />
              )}
            </div>
          )
        }}
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
        error={conflictMessage(decideMutation.error?.message)}
        onConfirm={() => submit(selectedIds, 'confirm')}
      />
      <ReasonModal
        isOpen={removing !== null}
        onOpenChange={(open) => !open && closeDialog()}
        title="Remove account"
        description={
          <>
            <strong className="block">Are you sure you want to remove this account?</strong>
            This permanently deletes the account, its roles and its passkeys. You cannot undo it. Only the audit trail
            keeps a record.
          </>
        }
        descriptionIsWarning
        summary={
          removing && (
            <UserCard name={removing.name} username={removing.username} department={removing.department} bordered />
          )
        }
        confirmLabel="Remove account"
        isCritical
        isConfirming={decideMutation.isSubmitting}
        error={conflictMessage(decideMutation.error?.message)}
        onConfirm={(reason) => removing && submit([removing.id], 'remove', reason)}
      />
      <EditRolesModal
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

/** Edit Roles and Remove for a pending row, each only for who may; nothing for a reviewed one, and a reason on your own. */
function RowActions({
  item,
  canEditRoles,
  canRemove,
  onRemove,
  onEdit,
}: {
  item: ReviewItem
  canEditRoles: boolean
  canRemove: boolean
  onRemove: (item: ReviewItem) => void
  onEdit: (item: ReviewItem) => void
}) {
  if (item.outcome !== 'pending') return <span className="text-base-content-medium">None</span>
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        {canEditRoles && (
          <Button
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            isDisabled={item.ownAccount}
            aria-label={`Edit roles of ${item.username}`}
            onPress={() => onEdit(item)}
          >
            <Pencil size={14} aria-hidden="true" />
            Edit Roles
          </Button>
        )}
        {canRemove && (
          <Button
            variant="outline"
            color="critical"
            size="sm"
            className="whitespace-nowrap"
            isDisabled={item.ownAccount}
            aria-label={`Remove ${item.username}`}
            onPress={() => onRemove(item)}
          >
            <Trash2 size={14} aria-hidden="true" />
            Remove
          </Button>
        )}
      </div>
      {item.ownAccount && <span className="text-xs text-base-content-medium">{OWN_ACCOUNT}</span>}
    </div>
  )
}
