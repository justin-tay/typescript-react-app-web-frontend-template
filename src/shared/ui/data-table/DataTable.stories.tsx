import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PaginationState, RowSelectionState, SortingState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { DataTable, DataTableToolbar, dataTableColumnHelper } from '.'

interface Person {
  id: string
  username: string
  displayName: string
  email: string
}

const people: Person[] = Array.from({ length: 47 }, (_, i) => ({
  id: String(i + 1),
  username: `user${String(i + 1).padStart(2, '0')}`,
  displayName: `Person ${i + 1}`,
  email: `user${i + 1}@example.com`,
}))

const column = dataTableColumnHelper<Person>()
const columns = [
  column.accessor('username', { header: 'Username' }),
  column.accessor('displayName', { header: 'Display name' }),
  column.accessor('email', { header: 'Email', enableSorting: false }),
]

/** Stands in for the server: sorts and pages the sample rows the way the API would. */
function ServerBackedTable({
  rows = people,
  isLoading,
  selectable,
  expandable,
}: {
  rows?: Person[]
  isLoading?: boolean
  selectable?: boolean
  expandable?: boolean
}) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')

  const matching = useMemo(
    () =>
      rows.filter((row) =>
        `${row.username} ${row.displayName} ${row.email}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, search],
  )

  const page = useMemo(() => {
    const sorted = [...matching]
    sorted.sort((a, b) => {
      for (const { id, desc } of sorting) {
        const key = id as keyof Person
        const order = a[key].localeCompare(b[key]) * (desc ? -1 : 1)
        if (order !== 0) return order
      }
      return 0
    })
    const start = pagination.pageIndex * pagination.pageSize
    return sorted.slice(start, start + pagination.pageSize)
  }, [matching, sorting, pagination])

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        search={search}
        onSearchChange={(text) => {
          setSearch(text)
          setPagination((current) => ({ ...current, pageIndex: 0 }))
        }}
        searchLabel="Search people"
        searchPlaceholder="Search by name, email or username"
      />
      <DataTable
        columns={columns}
        data={page}
        rowCount={matching.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        isLoading={isLoading}
        pageSizeOptions={[10, 20, 50]}
        getRowId={(row) => row.id}
        rowSelection={selectable ? rowSelection : undefined}
        onRowSelectionChange={selectable ? setRowSelection : undefined}
        renderExpanded={
          expandable
            ? (row) => (
                <p>
                  {row.displayName} signs in with {row.email}.
                </p>
              )
            : undefined
        }
      />
    </div>
  )
}

const meta: Meta<typeof DataTable<Person>> = {
  title: 'Shared/DataTable',
  component: DataTable<Person>,
}

export default meta
type Story = StoryObj

/** Click a column to sort; shift-click another to add it as a further sort column (up to 3). */
export const Default: Story = { render: () => <ServerBackedTable /> }

export const SinglePage: Story = {
  render: () => <ServerBackedTable rows={people.slice(0, 5)} />,
}

export const Loading: Story = { render: () => <ServerBackedTable isLoading /> }

export const Empty: Story = { render: () => <ServerBackedTable rows={[]} /> }

/** Selection is keyed by row id, so it survives paging. */
export const Selectable: Story = {
  render: () => <ServerBackedTable selectable />,
}

/** A chevron opens the detail under a row; which rows are open is kept by row id. */
export const Expandable: Story = {
  render: () => <ServerBackedTable expandable />,
}
