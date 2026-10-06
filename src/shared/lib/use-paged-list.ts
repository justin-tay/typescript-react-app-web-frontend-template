import type { OnChangeFn, PaginationState, SortingState } from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PAGE_SIZE, loadTableState, saveTableState, type TableState } from './table-state-storage'

export interface PageRequest {
  /** 0-based. */
  page: number
  size: number
  /** Each entry is `property,asc|desc`, in priority order. */
  sort?: string[]
  search?: string
  /** Only filters with a value; a cleared filter is left out. */
  filters: Record<string, string>
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

/**
 * Paging, sorting, search and filter state for a server-paged list, plus fetching it.
 * `fetchPage` must be a stable reference (a module-level function): a new one on each
 * render would refetch every time.
 *
 * With a `storageKey`, the whole state (including the current page) is kept in
 * sessionStorage, so a hard refresh returns to exactly the same view.
 *
 * Changing the search, a filter or the sort returns to the first page. A response for a
 * page past the end (say, after deleting the last row of the last page) moves to the last
 * page that exists instead of showing an empty table.
 */
export function usePagedList<T>(
  fetchPage: (request: PageRequest) => Promise<PagedResult<T>>,
  { pageSize = DEFAULT_PAGE_SIZE, storageKey }: { pageSize?: number; storageKey?: string } = {},
) {
  const [table, setTable] = useState<TableState>(() => loadTableState(storageKey, pageSize))
  const [state, setState] = useState<PagedListState<T>>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => saveTableState(storageKey, table), [storageKey, table])

  useEffect(() => {
    let cancelled = false
    const sort = table.sorting.map((s) => `${s.id},${s.desc ? 'desc' : 'asc'}`)
    fetchPage({
      page: table.pageIndex,
      size: table.pageSize,
      sort: sort.length > 0 ? sort : undefined,
      search: table.search === '' ? undefined : table.search,
      filters: table.filters,
    }).then(
      (result) => {
        if (cancelled) return
        const lastPage = Math.max(result.totalPages - 1, 0)
        if (table.pageIndex > lastPage) {
          setTable((current) => ({ ...current, pageIndex: lastPage }))
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
  }, [fetchPage, table.pageIndex, table.pageSize, table.sorting, table.search, table.filters, reloadToken])

  const onPaginationChange: OnChangeFn<PaginationState> = useCallback((updater) => {
    setTable((current) => {
      const next =
        typeof updater === 'function' ? updater({ pageIndex: current.pageIndex, pageSize: current.pageSize }) : updater
      return { ...current, pageIndex: next.pageIndex, pageSize: next.pageSize }
    })
  }, [])

  const onSortingChange: OnChangeFn<SortingState> = useCallback((updater) => {
    setTable((current) => ({
      ...current,
      pageIndex: 0,
      sorting: typeof updater === 'function' ? updater(current.sorting) : updater,
    }))
  }, [])

  const onSearchChange = useCallback((search: string) => {
    setTable((current) => (current.search === search ? current : { ...current, pageIndex: 0, search }))
  }, [])

  /** An empty value clears the filter. */
  const onFilterChange = useCallback((name: string, value: string) => {
    setTable((current) => {
      if ((current.filters[name] ?? '') === value) return current
      const filters = { ...current.filters }
      if (value === '') delete filters[name]
      else filters[name] = value
      return { ...current, pageIndex: 0, filters }
    })
  }, [])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  /** Like `reload`, but shows the loading state again: for a "Try again" after a failed load. */
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setReloadToken((token) => token + 1)
  }, [])

  /** Back to the first page with no search, filters or sort, keeping the page size. */
  const reset = useCallback(() => {
    setState({ status: 'loading' })
    setTable((current) => ({ ...current, pageIndex: 0, sorting: [], search: '', filters: {} }))
  }, [])

  return {
    state,
    pagination: { pageIndex: table.pageIndex, pageSize: table.pageSize },
    onPaginationChange,
    sorting: table.sorting,
    onSortingChange,
    search: table.search,
    onSearchChange,
    filters: table.filters,
    onFilterChange,
    reload,
    retry,
    reset,
  }
}
