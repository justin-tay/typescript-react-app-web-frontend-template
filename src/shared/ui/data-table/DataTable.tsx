import { Checkbox, Pagination, Select, SelectItem } from '@opengovsg/oui'
import {
  useTable,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { dataTableFeatures, type DataTableColumnDef } from './data-table-core'

/** The backend accepts at most this many sort columns (its ADR 0027). */
const MAX_SORT_COLUMNS = 3

/** Placeholder rows shown while loading never exceed this, however large the page size. */
const SKELETON_ROWS_MAX = 10

export interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[]
  data: TData[]
  rowCount: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  isLoading?: boolean
  getRowId?: (row: TData) => string
  emptyMessage?: string
  /** Shown instead of `emptyMessage` when there are no rows, e.g. a message with an action. */
  emptyState?: ReactNode
  /** Rows-per-page choices; the selector is hidden when omitted. */
  pageSizeOptions?: number[]
  /**
   * Renders one row as a card. When given, below the `lg` breakpoint (where the admin sidebar also becomes a drawer) the table is replaced
   * by a list of these cards, since a wide table is hard to use on a phone. Sorting is not
   * offered in the card list. Selection is: each card gets a checkbox, and the list a select-all.
   */
  mobileCard?: (row: TData) => ReactNode
  /**
   * Row selection, keyed by `getRowId` so it survives paging. A checkbox column with a
   * select-all for the visible page is shown only when both props are given.
   */
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  /** Rows this returns false for show a disabled checkbox and are skipped by select-all. */
  canSelectRow?: (row: TData) => boolean
}

function SkeletonBar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-base-divider-subtle ${className}`} />
}

/**
 * A table for large, server-paged datasets: TanStack Table drives column definitions,
 * sorting and paging state, this component only renders and forwards the resulting
 * requests to the server. Intended as the base for future spreadsheet-style tables, so it
 * knows nothing about any particular backend or resource.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  rowCount,
  pagination,
  onPaginationChange,
  sorting,
  onSortingChange,
  isLoading,
  getRowId,
  emptyMessage = 'No results.',
  emptyState,
  pageSizeOptions,
  mobileCard,
  rowSelection,
  onRowSelectionChange,
  canSelectRow,
}: DataTableProps<TData>) {
  const selectable = rowSelection !== undefined && onRowSelectionChange !== undefined
  const table = useTable(
    {
      features: dataTableFeatures,
      columns,
      data,
      state: selectable ? { pagination, sorting, rowSelection } : { pagination, sorting },
      onPaginationChange,
      onSortingChange,
      onRowSelectionChange,
      enableRowSelection: selectable ? (row) => canSelectRow?.(row.original) ?? true : false,
      manualPagination: true,
      manualSorting: true,
      maxMultiSortColCount: MAX_SORT_COLUMNS,
      rowCount,
      getRowId,
    },
    (state) => state,
  )

  const pageCount = table.getPageCount()
  const rows = table.getRowModel().rows
  const columnCount = columns.length + (selectable ? 1 : 0)
  const skeletonRowCount = Math.min(pagination.pageSize, SKELETON_ROWS_MAX)
  const firstShown = pagination.pageIndex * pagination.pageSize + 1
  const lastShown = Math.min(firstShown + pagination.pageSize - 1, rowCount)
  const empty = emptyState ?? emptyMessage

  return (
    <div className="flex flex-col gap-4">
      {mobileCard && (
        <div className="flex flex-col gap-3 lg:hidden">
          {selectable && !isLoading && rows.length > 0 && (
            <Checkbox
              isSelected={table.getIsAllPageRowsSelected()}
              isIndeterminate={table.getIsSomePageRowsSelected()}
              onChange={(checked) => table.toggleAllPageRowsSelected(checked)}
            >
              Select all on this page
            </Checkbox>
          )}
          <ul className="flex flex-col gap-3">
            {isLoading ? (
              <li role="status" aria-label="Loading" className="py-2">
                <SkeletonBar className="h-16 w-full" />
              </li>
            ) : rows.length === 0 ? (
              <li className="py-8 text-center text-base-content-medium">{empty}</li>
            ) : (
              rows.map((row) => (
                <li
                  key={row.id}
                  className={[
                    'flex items-start gap-3 rounded-lg border bg-base-canvas-default p-4',
                    row.getIsSelected() ? 'border-interaction-main-default' : 'border-base-divider-medium',
                  ].join(' ')}
                >
                  {selectable && (
                    <Checkbox
                      aria-label="Select row"
                      isSelected={row.getIsSelected()}
                      isDisabled={!row.getCanSelect()}
                      onChange={(checked) => row.toggleSelected(checked)}
                    />
                  )}
                  <div className="min-w-0 flex-1">{mobileCard(row.original)}</div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
      <div
        className={['overflow-x-auto rounded-lg border border-base-divider-medium', mobileCard ? 'hidden lg:block' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-base-divider-medium bg-base-canvas-alt">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {selectable && (
                  <th scope="col" className="w-10 px-4 py-3">
                    <Checkbox
                      aria-label="Select all rows on this page"
                      isSelected={table.getIsAllPageRowsSelected()}
                      isIndeterminate={table.getIsSomePageRowsSelected()}
                      isDisabled={isLoading || rows.length === 0}
                      onChange={(checked) => table.toggleAllPageRowsSelected(checked)}
                    />
                  </th>
                )}
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const direction = header.column.getIsSorted()
                  const sortPosition = header.column.getSortIndex() + 1
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
                      className="px-4 py-3 font-medium text-base-content-strong"
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className="flex items-center gap-1"
                          title="Sort by this column. Shift-click to add it as another sort column."
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
                          <span aria-hidden="true" className="flex items-center text-base-content-medium">
                            {direction === 'asc' ? (
                              <ArrowUp className="size-4" />
                            ) : direction === 'desc' ? (
                              <ArrowDown className="size-4" />
                            ) : (
                              <ChevronsUpDown className="size-4 opacity-50" />
                            )}
                            {direction && sorting.length > 1 ? sortPosition : ''}
                          </span>
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: skeletonRowCount }, (_, i) => (
                <tr
                  key={i}
                  className="border-b border-base-divider-subtle last:border-0"
                  {...(i === 0 ? { role: 'status', 'aria-label': 'Loading' } : {})}
                >
                  {Array.from({ length: columnCount }, (_, j) => (
                    <td key={j} className="px-4 py-3">
                      <SkeletonBar className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-base-content-medium">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  aria-selected={selectable ? row.getIsSelected() : undefined}
                  className="border-b border-base-divider-subtle last:border-0 aria-selected:bg-base-canvas-alt"
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <Checkbox
                        aria-label="Select row"
                        isSelected={row.getIsSelected()}
                        isDisabled={!row.getCanSelect()}
                        onChange={(checked) => row.toggleSelected(checked)}
                      />
                    </td>
                  )}
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rowCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span aria-live="polite">
              Showing {firstShown}–{lastShown} of {rowCount}
            </span>
            {pageSizeOptions && (
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap">Rows per page</span>
                <Select
                  aria-label="Rows per page"
                  value={String(pagination.pageSize)}
                  onChange={(size) => {
                    if (size !== null) onPaginationChange({ pageIndex: 0, pageSize: Number(size) })
                  }}
                >
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} id={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>
          {pageCount > 1 && (
            <Pagination
              total={pageCount}
              page={pagination.pageIndex + 1}
              onChange={(page) => table.setPageIndex(page - 1)}
              showControls
            />
          )}
        </div>
      )}
    </div>
  )
}
