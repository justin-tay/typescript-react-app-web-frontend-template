import { useCallback, useEffect, useState } from 'react'

export type Resource<T> = { status: 'loading' } | { status: 'loaded'; data: T } | { status: 'error'; error: Error }

export interface UseResourceOptions {
  /** When false nothing is fetched and the state stays `loading`; for data the person may not be allowed to read. */
  enabled?: boolean
  /**
   * Values that, when they change, fetch again without going back to `loading`: the data already on
   * screen stays until the new data arrives. Always the same number of values for one call site.
   */
  refreshOn?: readonly unknown[]
}

/**
 * Fetches one thing when the component mounts and whenever `args` change, and tracks it as
 * `loading`, `loaded` or `error`. `fetcher` must be a stable reference (a module-level function): a
 * new one on each render would refetch every time. A change to `args` goes back to `loading`, since
 * the data on screen is then for something else. `reload` fetches again but keeps the data on
 * screen, for refreshing after a change; `usePagedList` is the counterpart for a paged list.
 */
export function useResource<A extends unknown[], T>(
  fetcher: (...args: A) => Promise<T>,
  args: A,
  { enabled = true, refreshOn = [] }: UseResourceOptions = {},
): Resource<T> & { reload: () => void } {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const argsKey = JSON.stringify(args)
  const refreshKey = JSON.stringify(refreshOn)
  const [shownArgsKey, setShownArgsKey] = useState(argsKey)

  // Adjusted during render, as React recommends for state derived from a change in props.
  if (argsKey !== shownArgsKey) {
    setShownArgsKey(argsKey)
    setState({ status: 'loading' })
  }

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetcher(...args).then(
      (data) => !cancelled && setState({ status: 'loaded', data }),
      (e: unknown) => !cancelled && setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) }),
    )
    return () => {
      cancelled = true
    }
    // `args` is compared by value through `argsKey`, so a new array with the same contents does not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher, enabled, argsKey, reloadToken, refreshKey])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])
  return { ...state, reload }
}
