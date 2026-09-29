import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table'

/**
 * The feature set every DataTable instance uses: manual (server-driven) sorting and
 * pagination only. Fixed here so `ColumnDef`s built with `dataTableColumnHelper` type
 * against the same features as the table that renders them (see TanStack Table v9's
 * `tableFeatures`/`createColumnHelper` model).
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, datetime: sortFn_datetime, text: sortFn_text },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

// TValue defaults to `any`: a table's columns commonly hold different cell value types (a
// string column next to a display column with no accessor), so the array element type
// cannot fix one TValue for every column.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DataTableColumnDef<TData extends RowData, TValue = any> = ColumnDef<typeof dataTableFeatures, TData, TValue>

/** Column helper pre-typed to the DataTable feature set; use it to build a table's columns. */
export function dataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<typeof dataTableFeatures, TData>()
}
