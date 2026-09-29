import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface PageRequest {
  /** 0-based. */
  page: number
  size: number
  /** `property` or `property,asc|desc`. */
  sort?: string
}

export interface PagedResult<T> {
  items: T[]
  totalItems: number
  totalPages: number
}

export type PagedListState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; items: T[]; totalItems: number }
  | { status: 'error'; error: Error }

const DEFAULT_PAGE_SIZE = 20

/**
 * Paging and sorting state for a server-paged list, plus fetching it. `fetchPage` must be
 * a stable reference (a module-level function): a new one on each render would refetch
 * every time.
 *
 * A response for a page past the end (say, after deleting the last row of the last page)
 * moves to the last page that exists instead of showing an empty table. Changing the sort
 * returns to the first page.
 */
export function usePagedList<T>(
  fetchPage: (request: PageRequest) => Promise<PagedResult<T>>,
  { pageSize = DEFAULT_PAGE_SIZE }: { pageSize?: number } = {},
) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })
  const [sorting, setSorting] = useState<SortingState>([])
  const [state, setState] = useState<PagedListState<T>>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)

  const sort = useMemo(
    () => (sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined),
    [sorting],
  )

  useEffect(() => {
    let cancelled = false
    fetchPage({ page: pagination.pageIndex, size: pagination.pageSize, sort }).then(
      (result) => {
        if (cancelled) return
        const lastPage = Math.max(result.totalPages - 1, 0)
        if (pagination.pageIndex > lastPage) {
          setPagination((current) => ({ ...current, pageIndex: lastPage }))
          return
        }
        setState({ status: 'loaded', items: result.items, totalItems: result.totalItems })
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [fetchPage, pagination.pageIndex, pagination.pageSize, sort, reloadToken])

  const onSortingChange: OnChangeFn<SortingState> = useCallback((updater) => {
    setSorting(updater)
    setPagination((current) => (current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }))
  }, [])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return {
    state,
    pagination,
    onPaginationChange: setPagination as OnChangeFn<PaginationState>,
    sorting,
    onSortingChange,
    reload,
  }
}
