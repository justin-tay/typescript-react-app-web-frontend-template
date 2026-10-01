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

  it('shows placeholder rows instead of data while loading', () => {
    renderTable({ isLoading: true })

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Alice' })).not.toBeInTheDocument()
  })

  it('prefers a custom empty state over the empty message', () => {
    renderTable({ data: [], rowCount: 0, emptyState: <button type="button">Add one</button> })

    expect(screen.getByRole('button', { name: 'Add one' })).toBeInTheDocument()
    expect(screen.queryByText('No results.')).not.toBeInTheDocument()
  })

  it('summarises which rows are shown, even on a single page', () => {
    renderTable()
    expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument()
  })

  it('summarises the last, partial page', () => {
    renderTable({ rowCount: 35, pagination: { pageIndex: 3, pageSize: 10 } })
    expect(screen.getByText('Showing 31–35 of 35')).toBeInTheDocument()
  })

  it('shows no selection column unless selection state is given', () => {
    renderTable()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('selects a row and the whole page through the selection state', async () => {
    const onRowSelectionChange = vi.fn()
    renderTable({ rowSelection: { '1': true }, onRowSelectionChange })

    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    expect(boxes[1]).toBeChecked()
    expect(boxes[2]).not.toBeChecked()

    await userEvent.click(boxes[2])
    let updater = onRowSelectionChange.mock.calls[0][0]
    expect(typeof updater === 'function' ? updater({ '1': true }) : updater).toEqual({ '1': true, '2': true })

    await userEvent.click(boxes[0])
    updater = onRowSelectionChange.mock.calls[1][0]
    expect(typeof updater === 'function' ? updater({ '1': true }) : updater).toEqual({ '1': true, '2': true })
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

  it('offers a card per row for small screens when asked, and none otherwise', () => {
    renderTable({ mobileCard: (row) => <span>card for {row.name}</span> })

    expect(screen.getByText('card for Alice')).toBeInTheDocument()
    expect(screen.getByText('card for Bob')).toBeInTheDocument()
  })

  it('does not render cards unless a card renderer is given', () => {
    renderTable()

    expect(screen.queryByText(/card for/)).not.toBeInTheDocument()
  })

  it('does not show the page-size selector when there are no rows', () => {
    renderTable({ data: [], rowCount: 0, pageSizeOptions: [10, 20] })

    expect(screen.queryByText('Rows per page')).not.toBeInTheDocument()
  })

  describe('in the card list shown on small screens', () => {
    const mobileCard = (row: Row) => <p>{row.name} card</p>
    const cardList = () => within(screen.getByRole('list'))
    const resultOf = (call: unknown, from: Record<string, boolean>) => (typeof call === 'function' ? call(from) : call)

    it('offers a checkbox on each card, so rows can be selected without the table', async () => {
      const onRowSelectionChange = vi.fn()
      renderTable({ mobileCard, rowSelection: { '1': true }, onRowSelectionChange })

      const boxes = cardList().getAllByRole('checkbox', { name: 'Select row' })
      expect(boxes).toHaveLength(2)
      expect(boxes[0]).toBeChecked()
      expect(boxes[1]).not.toBeChecked()

      await userEvent.click(boxes[1])
      expect(resultOf(onRowSelectionChange.mock.calls[0][0], { '1': true })).toEqual({ '1': true, '2': true })
    })

    it('offers to select the whole page', async () => {
      const onRowSelectionChange = vi.fn()
      renderTable({ mobileCard, rowSelection: {}, onRowSelectionChange })

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select all on this page' }))

      expect(resultOf(onRowSelectionChange.mock.calls[0][0], {})).toEqual({ '1': true, '2': true })
    })

    it('disables the checkbox of a row that cannot be selected', () => {
      renderTable({
        mobileCard,
        rowSelection: {},
        onRowSelectionChange: vi.fn(),
        canSelectRow: (row) => row.id !== '2',
      })

      const [alice, bob] = cardList().getAllByRole('checkbox', { name: 'Select row' })
      expect(alice).toBeEnabled()
      expect(bob).toBeDisabled()
    })

    it('has no checkboxes when the table is not selectable', () => {
      renderTable({ mobileCard })

      expect(cardList().queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: 'Select all on this page' })).not.toBeInTheDocument()
    })
  })
})
