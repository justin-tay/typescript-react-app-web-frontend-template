import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePagedList, type PagedResult } from './use-paged-list'

function result(items: string[], totalItems = items.length, totalPages = 1): PagedResult<string> {
  return { items, totalItems, totalPages }
}

describe('usePagedList', () => {
  it('loads the first page with the default size and no sort', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a', 'b'], 2))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))

    expect(hook.current.state).toEqual({ status: 'loading' })
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))

    expect(fetchPage).toHaveBeenCalledWith({ page: 0, size: 20, sort: undefined })
    expect(hook.current.state).toEqual({ status: 'loaded', items: ['a', 'b'], totalItems: 2 })
  })

  it('requests the page the table moves to', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 60, 3))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))

    act(() => hook.current.onPaginationChange({ pageIndex: 2, pageSize: 20 }))

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 2, size: 20, sort: undefined }))
  })

  it('sends the first sort column as property,direction and returns to the first page', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a'], 60, 3))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))
    act(() => hook.current.onPaginationChange({ pageIndex: 2, pageSize: 20 }))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })))

    act(() => hook.current.onSortingChange([{ id: 'name', desc: true }]))

    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, size: 20, sort: 'name,desc' }))
    act(() => hook.current.onSortingChange([{ id: 'name', desc: false }]))
    await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, size: 20, sort: 'name,asc' }))
  })

  it('refetches on reload', async () => {
    const fetchPage = vi.fn().mockResolvedValue(result(['a']))
    const { result: hook } = renderHook(() => usePagedList(fetchPage))
    await waitFor(() => expect(hook.current.state.status).toBe('loaded'))

    act(() => hook.current.reload())

    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2))
  })

  it('moves to the last page that exists when the requested page is past the end', async () => {
    const fetchPage = vi.fn(async ({ page }: { page: number }) =>
      page === 0 ? result(['a'], 1, 1) : result([], 1, 1),
    )
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
