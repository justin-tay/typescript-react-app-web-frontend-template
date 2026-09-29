import { useEffect } from 'react'

const DEFAULT_DELAY_MS = 300

/** Calls `commit(text)` once `text` has stopped changing for `delayMs`. */
export function useDebouncedCommit(text: string, commit: (text: string) => void, delayMs = DEFAULT_DELAY_MS) {
  useEffect(() => {
    const timer = setTimeout(() => commit(text), delayMs)
    return () => clearTimeout(timer)
  }, [text, commit, delayMs])
}
