import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataTableToolbar } from './DataTableToolbar'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function renderToolbar(search = '') {
  const onSearchChange = vi.fn()
  render(
    <DataTableToolbar search={search} onSearchChange={onSearchChange} searchLabel="Search users">
      <span>a filter</span>
    </DataTableToolbar>,
  )
  return onSearchChange
}

const type = (text: string) =>
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search users' }), { target: { value: text } })

describe('DataTableToolbar', () => {
  it('starts with the saved search text and shows the filters beside the box', () => {
    renderToolbar('ada')

    expect(screen.getByRole('searchbox', { name: 'Search users' })).toHaveValue('ada')
    expect(screen.getByText('a filter')).toBeInTheDocument()
  })

  it('reports the search only once typing pauses, without surrounding spaces', () => {
    const onSearchChange = renderToolbar()
    onSearchChange.mockClear()

    type('a')
    act(() => vi.advanceTimersByTime(100))
    type(' ad ')
    act(() => vi.advanceTimersByTime(299))
    expect(onSearchChange).not.toHaveBeenCalledWith('ad')

    act(() => vi.advanceTimersByTime(1))
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('ad')
  })
})
