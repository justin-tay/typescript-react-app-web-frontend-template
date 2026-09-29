import { Pagination, Select, SelectItem, Spinner } from '@opengovsg/oui'
import {
  useTable,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
import { dataTableFeatures, type DataTableColumnDef } from './data-table-core'

/**
 * A table for large, server-paged datasets: TanStack Table drives column definitions,
 * sorting and paging state, this component only renders and forwards the resulting
 * requests to the server. Intended as the base for future spreadsheet-style tables, so it
 * knows nothing about any particular backend or resource.
 */
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
  /** Rows-per-page choices; the selector is hidden when omitted. */
  pageSizeOptions?: number[]
}

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
  pageSizeOptions,
}: DataTableProps<TData>) {
  const table = useTable(
    {
      features: dataTableFeatures,
      columns,
      data,
      state: { pagination, sorting },
      onPaginationChange,
      onSortingChange,
      manualPagination: true,
      manualSorting: true,
      rowCount,
      getRowId,
    },
    (state) => state,
  )

  const pageCount = table.getPageCount()

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-base-divider-medium">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-base-divider-medium bg-base-canvas-alt">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const direction = header.column.getIsSorted()
                  return (
                    <th key={header.id} scope="col" className="px-4 py-3 font-medium text-base-content-strong">
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className="flex items-center gap-1"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={header} />
                          <span aria-hidden="true">
                            {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : ''}
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
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center">
                  <Spinner aria-label="Loading" />
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-base-content-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-base-divider-subtle last:border-0">
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
      {(pageCount > 1 || (pageSizeOptions && rowCount > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {pageSizeOptions && rowCount > 0 ? (
            <div className="flex items-center gap-2 text-sm">
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
          ) : (
            <span />
          )}
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
