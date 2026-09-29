import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable } from './DataTable'
import { dataTableColumnHelper } from './data-table-core'

interface Row {
  id: string
  name: string
  note: string
}

const helper = dataTableColumnHelper<Row>()
const columns = [
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('note', { header: 'Note', enableSorting: false }),
]
const rows: Row[] = [
  { id: '1', name: 'Alice', note: 'first' },
  { id: '2', name: 'Bob', note: 'second' },
]

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  const handlers = { onPaginationChange: vi.fn(), onSortingChange: vi.fn() }
  render(
    <DataTable
      columns={columns}
      data={rows}
      rowCount={rows.length}
      pagination={{ pageIndex: 0, pageSize: 10 }}
      sorting={[]}
      getRowId={(row) => row.id}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('DataTable', () => {
  it('renders a header per column and a row per record', () => {
    renderTable()

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Note'])
    expect(screen.getByRole('cell', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'second' })).toBeInTheDocument()
  })

  it('shows the empty message when there are no rows', () => {
    renderTable({ data: [], rowCount: 0, emptyMessage: 'Nothing here.' })

    expect(screen.getByText('Nothing here.')).toBeInTheDocument()
  })

  it('shows a spinner instead of rows while loading', () => {
    renderTable({ isLoading: true })

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Alice' })).not.toBeInTheDocument()
  })

  it('asks for a sort when a sortable header is pressed, and not for a non-sortable one', async () => {
    const { onSortingChange } = renderTable()

    expect(screen.queryByRole('button', { name: 'Note' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Name' }))

    expect(onSortingChange).toHaveBeenCalledTimes(1)
    const updater = onSortingChange.mock.calls[0][0]
    expect(typeof updater === 'function' ? updater([]) : updater).toEqual([{ id: 'name', desc: false }])
  })

  it('does not render a pager when everything fits on one page', () => {
    renderTable()

    expect(screen.queryByLabelText(/pagination item/)).not.toBeInTheDocument()
  })

  it('shows the pager for several pages and asks for the page that is pressed', async () => {
    const { onPaginationChange } = renderTable({ rowCount: 35, pagination: { pageIndex: 0, pageSize: 10 } })

    expect(screen.getByLabelText('pagination item 1 active')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'pagination item 2' }))

    expect(onPaginationChange).toHaveBeenCalled()
    const updater = onPaginationChange.mock.calls[0][0]
    const next = typeof updater === 'function' ? updater({ pageIndex: 0, pageSize: 10 }) : updater
    expect(next.pageIndex).toBe(1)
  })

  it('hides the page-size selector unless options are given', () => {
    renderTable()

    expect(screen.queryByText('Rows per page')).not.toBeInTheDocument()
  })

  it('offers the page sizes and returns to the first page when one is chosen', async () => {
    const { onPaginationChange } = renderTable({
      rowCount: 35,
      pagination: { pageIndex: 2, pageSize: 10 },
      pageSizeOptions: [10, 20, 50],
    })

    await userEvent.click(screen.getByRole('button', { name: /Rows per page/ }))
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '50' }))

    expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 0, pageSize: 50 })
  })

  it('does not show the page-size selector when there are no rows', () => {
    renderTable({ data: [], rowCount: 0, pageSizeOptions: [10, 20] })

    expect(screen.queryByText('Rows per page')).not.toBeInTheDocument()
  })
})
