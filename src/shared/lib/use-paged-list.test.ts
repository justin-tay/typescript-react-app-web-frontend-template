import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePagedList, type PagedResult } from './use-paged-list'
import { clearPersistedTableState, presetTableState } from './table-state-storage'

function result(items: string[], totalItems = items.length, totalPages = 1): PagedResult<string> {
  return { items, totalItems, totalPages }
}

const firstPage = { page: 0, size: 20, sort: undefined, search: undefined, filters: {} }

afterEach(() => {
  sessionStorage.clear()
})

describe('usePagedList', () => {
  it('loads the first page with the default size, no sort, no search and no filters', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a', 'b'], 2))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))

    expect(hook.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))

    expect(fetchPage).toHaveBeenCalledWith(firstPage)
    expect(hook.current.state).toEqual({ status: 'loaded', items: ['a', 'b'], totalItems: 2 })
  })

  it('requests the page the table moves to', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 60, 3))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))

    act(() => hook.current.onPaginationChange({ pageIndex: 2, pageSize: 20 }))

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ ...firstPage, page: 2 }))
  })

  it('sends every sort column in priority order and returns to the first page', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 60, 3))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    act(() => hook.current.onPaginationChange({ pageIndex: 2, pageSize: 20 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))

    act(() =>
      hook.current.onSortingChange([
        { id: 'username', desc: false },
        { id: 'createdAt', desc: true },
      ]),
    )

    await waitFor(() =>
      expect(fetchPage).toHaveBeenLastCalledWith({ ...firstPage, sort: ['username,asc', 'createdAt,desc'] }),
    )
  })

  it('sends the search text, and returns to the first page when it changes', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 60, 3))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    act(() => hook.current.onPaginationChange({ pageIndex: 2, pageSize: 20 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))

    act(() => hook.current.onSearchChange('ada'))

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ ...firstPage, search: 'ada' }))
  })

  it('sends a filter, returns to the first page, and leaves it out once cleared', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 60, 3))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    act(() => hook.current.onPaginationChange({ pageIndex: 1, pageSize: 20 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })))

    act(() => hook.current.onFilterChange('status', 'pending'))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ ...firstPage, filters: { status: 'pending' } }))

    act(() => hook.current.onFilterChange('status', ''))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(firstPage))
  })

  it('refetches on reload', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))

    act(() => hook.current.reload())

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2))
  })

  it('moves to the last page that exists when the requested page is past the end', async () => {
    const fetchPage = vi.fn(async ({ page }: { page: number }) => (page === 0 ? result(['a'], 1, 1) : result([], 1, 1)))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))

    act(() => hook.current.onPaginationChange({ pageIndex: 3, pageSize: 20 }))

    await waitFor(() => expect(hook.current.pagination.pageIndex).toBe(0))
    await waitFor(() => expect(hook.current.state).toEqual({ status: 'loaded', items: ['a'], totalItems: 1 }))
  })

  it('stays on the first page when there are no rows at all', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result([], 0, 0))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))

    await waitFor(() => expect(hook.current.state).toEqual({ status: 'loaded', items: [], totalItems: 0 }))
    expect(hook.current.pagination.pageIndex).toBe(0)
  })

  it('reports a failed fetch as an error state', async () => {
    const fetchPage = vi.fn().mockRejectedValue(new Error('boom'))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))

    await waitFor(() => expect(hook.current.state.status).toBe('error'))
    expect(hook.current.state).toEqual({ status: 'error', error: new Error('boom') })
  })

  it('ignores a response that arrives after a newer request was made', async () => {
    let resolveFirst: (value: PagedResult<string>) => void = () => {}
    const fetchPage = vi
      .fn()
      .mockImplementationOnce(() => new Promise<PagedResult<string>>((resolve) => (resolveFirst = resolve)))
      .mockResolvedValue(result(['second'], 1))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))

    act(() => hook.current.onSortingChange([{ id: 'name', desc: false }]))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    await act(async () => resolveFirst(result(['first'], 1)))

    expect(hook.current.state).toEqual({ status: 'loaded', items: ['second'], totalItems: 1 })
  })
})

describe('usePagedList persistence', () => {
  const options = { storageKey: 'users' }

  async function changeEverything() {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 200, 10))
    const first = renderHook(() => usePagedList(fetchPage, options))
    await waitFor(() => expect(first.result.current.state.status).toBe('loaded'))
    act(() => {
      first.result.current.onSearchChange('ada')
      first.result.current.onFilterChange('status', 'pending')
      first.result.current.onSortingChange([{ id: 'username', desc: true }])
    })
    act(() => first.result.current.onPaginationChange({ pageIndex: 3, pageSize: 50 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, size: 50 })))
    first.unmount()
  }

  it('restores the exact same state after a refresh', async () => {
    await changeEverything()

    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 200, 10))
    renderHook(() => usePagedList(fetchPage, options))

    await waitFor(() =>
      expect(fetchPage).toHaveBeenCalledWith({
        page: 3,
        size: 50,
        sort: ['username,desc'],
        search: 'ada',
        filters: { status: 'pending' },
      }),
    )
  })

  it('keeps each table under its own key', async () => {
    await changeEverything()

    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    renderHook(() => usePagedList(fetchPage, { storageKey: 'groups' }))

    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(firstPage))
  })

  it('does not save anything without a storage key', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    act(() => hook.current.onSearchChange('ada'))

    expect(sessionStorage.length).toBe(0)
  })

  it('starts from the defaults when the saved state is corrupt', async () => {
    sessionStorage.setItem('table-state:users', '{"pageIndex":"three","search":1}')
    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    renderHook(() => usePagedList(fetchPage, options))

    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(firstPage))
  })

  it('still works when sessionStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    const { result: hook } = renderHook(() => usePagedList(fetchPage, options))

    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    vi.restoreAllMocks()
  })

  it('forgets every saved table when told to', async () => {
    await changeEverything()
    sessionStorage.setItem('unrelated', 'kept')

    clearPersistedTableState()

    expect(sessionStorage.getItem('table-state:users')).toBeNull()
    expect(sessionStorage.getItem('unrelated')).toBe('kept')
  })
})

describe('presetTableState', () => {
  it('makes the list open on the first page with the given filters, keeping its sort and page size', async () => {
    sessionStorage.setItem(
      'table-state:users',
      JSON.stringify({
        pageIndex: 4,
        pageSize: 50,
        sorting: [{ id: 'username', desc: true }],
        search: 'ada',
        filters: { groupId: 'g1' },
      }),
    )

    presetTableState('users', { status: 'pending' })

    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    renderHook(() => usePagedList(fetchPage, { storageKey: 'users' }))
    await waitFor(() =>
      expect(fetchPage).toHaveBeenCalledWith({
        page: 0,
        size: 50,
        sort: ['username,desc'],
        search: undefined,
        filters: { status: 'pending' },
      }),
    )
  })

  it('works for a list that has no saved state yet', async () => {
    presetTableState('groups', {})

    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    renderHook(() => usePagedList(fetchPage, { storageKey: 'groups' }))
    await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(firstPage))
  })
})

describe('usePagedList retry and reset', () => {
  it('shows the loading state again on retry after a failure', async () => {
    const fetchPage = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValue(result(['a']))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('error'))

    act(() => hook.current.retry())

    expect(hook.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
  })

  it('reset forgets search, filters, sort and page but keeps the page size', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 60, 3))
    const { result: hook } = renderHook(() => usePagedList(fetchPage, { pageSize: 50 }))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    act(() => hook.current.onSearchChange('ada'))
    act(() => hook.current.onFilterChange('status', 'active'))
    act(() => hook.current.onSortingChange([{ id: 'name', desc: true }]))

    act(() => hook.current.reset())

    await waitFor(() =>
      expect(fetchPage).toHaveBeenLastCalledWith({
        page: 0,
        size: 50,
        sort: undefined,
        search: undefined,
        filters: {},
      }),
    )
  })
})
