import { useEffect, useState } from 'react'

export interface RemoteOption {
  id: string
  name: string
}

export interface RemoteOptionsResult {
  items: RemoteOption[]
  totalItems: number
}

/** Fetches the options matching `search`, at most `size` of them. */
export type SearchOptions = (query: { search: string; size: number }) => Promise<RemoteOptionsResult>

const DEFAULT_SIZE = 20
const TYPING_DELAY_MS = 250

/**
 * Server-side type-ahead: the options matching what was typed, fetched once typing pauses.
 * Only the first `size` matches are loaded; `totalItems` says how many there are in all, so
 * the picker can tell the person to keep typing to narrow a long list.
 */
export function useRemoteOptions(searchOptions: SearchOptions, inputValue: string, size = DEFAULT_SIZE) {
  const [result, setResult] = useState<RemoteOptionsResult>({ items: [], totalItems: 0 })
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(
      () => {
        searchOptions({ search: inputValue, size }).then(
          (next) => {
            if (cancelled) return
            setResult(next)
            setFailed(false)
          },
          () => {
            if (cancelled) return
            setResult({ items: [], totalItems: 0 })
            setFailed(true)
          },
        )
      },
      inputValue === '' ? 0 : TYPING_DELAY_MS,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchOptions, inputValue, size])

  return { options: result.items, totalItems: result.totalItems, failed }
}

/**
 * The note under a picker: that the options could not be loaded (an empty list would otherwise read as
 * "nothing matches"), or that the list is only the first part of the matches.
 */
export function optionsNote(shown: number, total: number, failed = false): string | undefined {
  if (failed) return 'Could not load the options. Try again later.'
  return total > shown ? `Showing ${shown} of ${total}. Keep typing to narrow the list.` : undefined
}
