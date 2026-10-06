import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useMemo, useState } from 'react'
import { AUDIT_TARGET_TYPES, listAuditEvents, type AuditEvent } from './api'
import { formatDateTime } from '@/shared/lib/format'
import { humanize } from '@/shared/lib/labels'
import { usePagedList } from '@/shared/lib/use-paged-list'
import { DataTable, dataTableColumnHelper } from '@/shared/ui/data-table'
import { DebouncedTextField } from '@/shared/ui/debounced-text-field'
import { DescriptionList } from '@/shared/ui/description-list'
import { FilterSelect } from '@/shared/ui/filter-select'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { reasonLabel } from '@/shared/ui/reason-modal'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const columnHelper = dataTableColumnHelper<AuditEvent>()

const TARGET_TYPE_FILTERS = AUDIT_TARGET_TYPES.map((id) => ({ id, label: humanize(id) }))

const target = (event: AuditEvent) =>
  [humanize(event.targetType), event.targetDisplayName ?? event.targetName].filter(Boolean).join(': ')

/** A details value as text: lists joined, an object as formatted JSON. */
function DetailValue({ value }: { value: unknown }) {
  if (Array.isArray(value))
    return <>{value.length === 0 ? 'None' : value.map((entry) => humanize(String(entry))).join(', ')}</>
  if (value !== null && typeof value === 'object') {
    return <pre className="overflow-x-auto text-sm">{JSON.stringify(value, null, 2)}</pre>
  }
  return <>{String(value)}</>
}

function EventDetails({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  const details = Object.entries(event?.details ?? {})
  return (
    <Modal isOpen={event !== null} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader>{event ? humanize(event.action) : ''}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {event && (
                <>
                  <DescriptionList
                    items={[
                      { label: 'When', value: formatDateTime(event.occurredAt) },
                      { label: 'Actor', value: event.actor },
                      { label: 'Target', value: target(event) },
                      ...(event.reasonCode
                        ? [{ label: 'Reason', value: reasonLabel(event.reasonCode, event.reasonNote) }]
                        : []),
                    ]}
                  />
                  {details.length > 0 && (
                    <DescriptionList
                      items={details.map(([key, value]) => ({
                        label: humanize(key),
                        value: <DetailValue value={value} />,
                      }))}
                    />
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}

/** The business audit trail: who changed which user, role, setting or review. */
export function AuditTrail() {
  const { state, pagination, onPaginationChange, sorting, onSortingChange, filters, onFilterChange, retry, reset } =
    usePagedList(listAuditEvents, { storageKey: 'audit-events' })
  const [selected, setSelected] = useState<AuditEvent | null>(null)

  const columns = useMemo(
    () => [
      columnHelper.accessor('occurredAt', { header: 'When', cell: ({ getValue }) => formatDateTime(getValue()) }),
      columnHelper.display({ id: 'actor', header: 'Actor', cell: ({ row }) => row.original.actor }),
      columnHelper.display({ id: 'action', header: 'Action', cell: ({ row }) => humanize(row.original.action) }),
      columnHelper.display({ id: 'target', header: 'Target', cell: ({ row }) => target(row.original) }),
      columnHelper.display({
        id: 'reason',
        header: 'Reason',
        cell: ({ row }) =>
          row.original.reasonCode ? reasonLabel(row.original.reasonCode, row.original.reasonNote) : '',
      }),
      columnHelper.display({
        id: 'details',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="clear"
            aria-label={`Details of ${humanize(row.original.action)}`}
            onPress={() => setSelected(row.original)}
          >
            Details
          </Button>
        ),
      }),
    ],
    [],
  )

  if (state.status === 'error') return <LoadError error={state.error} onRetry={retry} onClearFilters={reset} />

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Audit trail" subtitle="A record of changes to users, roles, settings and reviews." />
      <div className="filter-row">
        <DebouncedTextField
          label="Actor"
          value={filters.actor ?? ''}
          onCommit={(value) => onFilterChange('actor', value)}
        />
        <FilterSelect
          label="Target type"
          value={filters.targetType}
          onChange={(value) => onFilterChange('targetType', value)}
          options={TARGET_TYPE_FILTERS}
        />
        <DebouncedTextField
          label="Target name"
          value={filters.targetName ?? ''}
          onCommit={(value) => onFilterChange('targetName', value)}
        />
        <DebouncedTextField
          label="Action"
          value={filters.action ?? ''}
          onCommit={(value) => onFilterChange('action', value)}
        />
        <TextField
          label="From"
          type="date"
          value={filters.occurredFrom ?? ''}
          onChange={(value) => onFilterChange('occurredFrom', value)}
        />
        <TextField
          label="To"
          type="date"
          value={filters.occurredTo ?? ''}
          onChange={(value) => onFilterChange('occurredTo', value)}
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
        getRowId={(event) => event.id}
        mobileCard={(event) => (
          <div className="flex flex-col gap-1">
            <p className="font-medium">{humanize(event.action)}</p>
            <p className="text-sm">{target(event)}</p>
            <p className="text-sm text-base-content-medium">
              {event.actor}, {formatDateTime(event.occurredAt)}
            </p>
            <div>
              <Button
                variant="clear"
                aria-label={`Details of ${humanize(event.action)}`}
                onPress={() => setSelected(event)}
              >
                Details
              </Button>
            </div>
          </div>
        )}
        emptyMessage={Object.keys(filters).length > 0 ? 'No events match these filters.' : 'No events recorded yet.'}
      />
      <EventDetails event={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
