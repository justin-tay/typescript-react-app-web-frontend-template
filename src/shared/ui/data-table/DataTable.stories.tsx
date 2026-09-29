import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { DataTable, dataTableColumnHelper } from '.'

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
function ServerBackedTable({ rows = people, isLoading }: { rows?: Person[]; isLoading?: boolean }) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<SortingState>([])

  const page = useMemo(() => {
    const sorted = [...rows]
    const [sort] = sorting
    if (sort) {
      const key = sort.id as keyof Person
      sorted.sort((a, b) => a[key].localeCompare(b[key]) * (sort.desc ? -1 : 1))
    }
    const start = pagination.pageIndex * pagination.pageSize
    return sorted.slice(start, start + pagination.pageSize)
  }, [rows, sorting, pagination])

  return (
    <DataTable
      columns={columns}
      data={page}
      rowCount={rows.length}
      pagination={pagination}
      onPaginationChange={setPagination}
      sorting={sorting}
      onSortingChange={setSorting}
      isLoading={isLoading}
      pageSizeOptions={[10, 20, 50]}
      getRowId={(row) => row.id}
    />
  )
}

const meta: Meta<typeof DataTable<Person>> = {
  title: 'Shared/DataTable',
  component: DataTable<Person>,
}

export default meta
type Story = StoryObj

export const Default: Story = { render: () => <ServerBackedTable /> }

export const SinglePage: Story = { render: () => <ServerBackedTable rows={people.slice(0, 5)} /> }

export const Loading: Story = { render: () => <ServerBackedTable isLoading /> }

export const Empty: Story = { render: () => <ServerBackedTable rows={[]} /> }
