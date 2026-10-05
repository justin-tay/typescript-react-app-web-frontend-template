import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useCallback, useMemo, useState } from 'react'
import {
  confirmPopulation,
  listDepartments,
  listPopulation,
  type Population,
  type PopulationEntry,
  type Task,
} from './api'
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

const COPY: Record<Population, { noun: string; verb: string; when: string }> = {
  suspended: { noun: 'suspended', verb: 'Suspended', when: 'Suspended' },
  removed: { noun: 'removed', verb: 'Removed', when: 'Removed' },
}

/**
 * The accounts suspended or removed since the last review: a read-only list with one Confirm for the whole list.
 * Once confirmed the server keeps the list as it was, and this shows who confirmed it and when.
 */
export function PopulationTab({
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
  const [isConfirming, setIsConfirming] = useState(false)
  const [note, setNote] = useState('')
  const mutation = useMutation(confirmPopulation)

  const refresh = useCallback(() => {
    reload()
    onChanged()
    notifyTaskSummaryChanged()
  }, [reload, onChanged])
  useRefetchOnFocus(refresh)

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
        id: 'lastLoginAt',
        header: 'Last login',
        cell: ({ row }) =>
          row.original.lastLoginAt ? (
            formatDateTime(row.original.lastLoginAt)
          ) : (
            <span className="text-base-content-medium">Never</span>
          ),
      }),
      columnHelper.accessor('occurredAt', { header: when, cell: ({ getValue }) => formatDateTime(getValue()) }),
      columnHelper.display({ id: 'actor', header: 'By', cell: ({ row }) => row.original.actor }),
      columnHelper.display({
        id: 'reason',
        header: 'Reason',
        cell: ({ row }) => reasonLabel(row.original.reasonCode, row.original.reasonNote),
      }),
    ],
    [when],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  const departmentOptions =
    departments.status === 'loaded' ? departments.data.map((name) => ({ id: name, label: name })) : []

  const close = () => {
    setIsConfirming(false)
    setNote('')
    mutation.clearError()
  }

  return (
    <div className="flex flex-col gap-4">
      {status.confirmed ? (
        <Infobox variant="success">
          Confirmed by {status.confirmedBy}
          {status.confirmedAt ? ` on ${formatDateTime(status.confirmedAt)}` : ''}
          {status.count != null ? `, ${status.count} ${status.count === 1 ? 'account' : 'accounts'}` : ''}.
          {status.note ? ` Note: ${status.note}` : ''}
        </Infobox>
      ) : (
        task.status === 'open' && (
          <div className="flex flex-wrap items-center gap-3">
            <Button onPress={() => setIsConfirming(true)}>Confirm {noun} accounts as reviewed</Button>
            <p className="text-sm text-base-content-medium">
              Confirming records this list as it is now. It cannot be changed afterwards.
            </p>
          </div>
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
        mobileCard={(entry) => (
          <div className="flex flex-col gap-1">
            <p className="font-medium">{entry.name}</p>
            <p className="text-sm text-base-content-medium">
              {entry.username}
              {entry.department ? `, ${entry.department}` : ''}
            </p>
            <p className="text-sm text-base-content-medium">
              {when} {formatDateTime(entry.occurredAt)} by {entry.actor}.{' '}
              {reasonLabel(entry.reasonCode, entry.reasonNote)}
            </p>
          </div>
        )}
        emptyMessage={
          search || Object.keys(filters).length > 0 ? 'No accounts match these filters.' : `No ${noun} accounts.`
        }
      />
      <Modal isOpen={isConfirming} onOpenChange={(open) => !open && close()}>
        <ModalContent>
          {(dismiss) => (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!(await mutation.run(task.id, population, note.trim() || undefined)).ok) return reload()
                close()
                refresh()
              }}
            >
              <ModalHeader>Confirm {noun} accounts</ModalHeader>
              <ModalBody className="flex flex-col gap-4">
                <p>
                  Confirm that you have reviewed the {noun} accounts? The list is kept as it is now, and this is
                  recorded in the audit trail. It can only be confirmed once.
                </p>
                {mutation.error && <Infobox variant="error">{mutation.error.message}</Infobox>}
                <TextField
                  label="Note (optional)"
                  value={note}
                  onChange={setNote}
                  maxLength={NOTE_MAX_LENGTH}
                  description={`${note.length}/${NOTE_MAX_LENGTH}`}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="outline" onPress={dismiss} isDisabled={mutation.isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isDisabled={mutation.isSubmitting}>
                  Confirm
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
