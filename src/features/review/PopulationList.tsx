import { Button, Infobox, Radio, RadioGroup, TextField } from '@opengovsg/oui'
import { useCallback, useMemo, useState } from 'react'
import {
  confirmPopulation,
  listDepartments,
  listPopulation,
  type Population,
  type PopulationEntry,
  type Task,
} from './api'
import { DaysInactive, LastLogin } from './InactivityCells'
import { inactiveDays } from '@/shared/lib/inactivity'
import { UserCard } from './UserCard'
import { useRefetchOnFocus } from './use-refetch-on-focus'
import { notifyTaskSummaryChanged } from './use-task-summary'
import { formatDateTime } from '@/shared/lib/format'
import { useMutation } from '@/shared/lib/use-mutation'
import { usePagedList, type PageRequest } from '@/shared/lib/use-paged-list'
import { useResource } from '@/shared/lib/use-resource'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '@/shared/ui/data-table'
import { FilterSelect } from '@/shared/ui/filter-select'
import { LoadError } from '@/shared/ui/load-error'
import { NOTE_MAX_LENGTH, reasonLabel } from '@/shared/ui/reason-modal'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<PopulationEntry>()

const COPY: Record<Population, { noun: string; when: string }> = {
  suspended: { noun: 'suspended', when: 'Suspended' },
  removed: { noun: 'removed', when: 'Removed' },
}

const actorLabel = (actor: string) => (actor === 'system' ? 'System' : actor)

type Choice = 'ok' | 'concerns'

/**
 * The accounts suspended or removed since the last review: a read-only list and one confirmation for the whole
 * list. The reviewer either says it looks complete and correct, or confirms with remarks about what looks wrong. The
 * remarks are the confirmation's note, which the report carries; the server does not treat the two differently, so
 * neither blocks the review. Once confirmed the server keeps the list as it was and this shows who confirmed it.
 */
export function PopulationList({
  task,
  population,
  onChanged,
}: {
  task: Task
  population: Population
  onChanged: () => void
}) {
  const { noun, when } = COPY[population]
  const status = task.populations[population]
  const fetchPage = useCallback(
    ({ page, size, sort, search, filters }: PageRequest) =>
      listPopulation(task.id, population, { page, size, sort, search, filters }),
    [task.id, population],
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
  } = usePagedList(fetchPage, { storageKey: `review-${population}:${task.id}` })
  const departments = useResource(listDepartments, [task.id])
  const [choice, setChoice] = useState<Choice | null>(null)
  const [remarks, setRemarks] = useState('')
  const mutation = useMutation(confirmPopulation)
  useRefetchOnFocus(reload)

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
        id: 'lastLoginAt',
        header: 'Last login',
        cell: ({ row }) => <LastLogin lastLoginAt={row.original.lastLoginAt} />,
      }),
      columnHelper.display({
        id: 'inactiveDays',
        header: 'Days inactive',
        cell: ({ row }) => (
          <DaysInactive
            lastActivityAt={row.original.lastActivityAt}
            endedAt={row.original.occurredAt}
            endedLabel={`when ${noun}`}
          />
        ),
      }),
      columnHelper.accessor('occurredAt', { header: when, cell: ({ getValue }) => formatDateTime(getValue()) }),
      columnHelper.display({ id: 'actor', header: 'By', cell: ({ row }) => actorLabel(row.original.actor) }),
      columnHelper.display({
        id: 'reason',
        header: 'Reason',
        cell: ({ row }) => reasonLabel(row.original.reasonCode, row.original.reasonNote),
      }),
    ],
    [when, noun],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  const departmentOptions =
    departments.status === 'loaded' ? departments.data.map((name) => ({ id: name, label: name })) : []
  const canConfirm = choice === 'ok' || (choice === 'concerns' && remarks.trim() !== '')

  return (
    <div className="flex flex-col gap-4">
      {status.confirmed ? (
        <Infobox variant="success">
          <p className="font-medium">{status.note ? 'Confirmed with remarks' : 'Confirmed'}</p>
          <p>
            Confirmed by {status.confirmedBy}
            {status.confirmedAt ? ` on ${formatDateTime(status.confirmedAt)}` : ''}
            {status.count != null ? `. ${status.count} ${status.count === 1 ? 'account' : 'accounts'}` : ''}.
          </p>
          {status.note && <p>Remarks: {status.note}</p>}
        </Infobox>
      ) : (
        task.status === 'open' && (
          <Infobox variant="info">
            Review a few records from the list. You do not need to check every account, and you cannot change these
            accounts here. If something looks wrong, choose &quot;I have concerns about this list&quot; and say what.
          </Infobox>
        )
      )}
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
        getRowId={(entry) => entry.userId}
        mobileCard={(entry) => {
          const days = inactiveDays({ lastActivityAt: entry.lastActivityAt, endedAt: entry.occurredAt }, new Date())
          return (
            <div className="flex flex-col gap-2">
              <UserCard name={entry.name} username={entry.username} department={entry.department} />
              <p className="text-sm">
                Last login: <LastLogin lastLoginAt={entry.lastLoginAt} />
                {days !== null && ` (${days.toLocaleString()} ${days === 1 ? 'day' : 'days'} inactive when ${noun})`}
              </p>
              <p className="text-sm text-base-content-medium">
                {when} {formatDateTime(entry.occurredAt)} by {actorLabel(entry.actor)}.{' '}
                {reasonLabel(entry.reasonCode, entry.reasonNote)}
              </p>
            </div>
          )
        }}
        emptyMessage={
          search || Object.keys(filters).length > 0 ? 'No accounts match these filters.' : `No ${noun} accounts.`
        }
      />
      {!status.confirmed && task.status === 'open' && (
        <form
          className="flex flex-col gap-4 rounded-lg border border-base-divider-medium p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!canConfirm) return
            const result = await mutation.run(task.id, population, choice === 'concerns' ? remarks.trim() : undefined)
            if (!result.ok) return reload()
            setChoice(null)
            setRemarks('')
            reload()
            onChanged()
            notifyTaskSummaryChanged()
          }}
        >
          {mutation.error && <Infobox variant="error">{mutation.error.message}</Infobox>}
          <RadioGroup
            label={`Confirm the ${noun} accounts`}
            value={choice ?? ''}
            onChange={(value) => setChoice(value as Choice)}
          >
            <Radio value="ok">I have reviewed a few records and the list looks complete and correct.</Radio>
            <Radio value="concerns">I have concerns about this list.</Radio>
          </RadioGroup>
          {choice === 'concerns' && (
            <TextField
              label="Remarks"
              description={`Say what looks wrong. It is saved with the report and does not stop the review from completing. ${remarks.length}/${NOTE_MAX_LENGTH}`}
              value={remarks}
              onChange={setRemarks}
              maxLength={NOTE_MAX_LENGTH}
              isRequired
            />
          )}
          <p className="text-sm text-base-content-medium">
            Confirming saves this list as it is now. You cannot undo it.
          </p>
          <div>
            <Button type="submit" isDisabled={!canConfirm || mutation.isSubmitting}>
              {choice === 'concerns' ? 'Confirm with remarks' : `Confirm ${noun} accounts`}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
