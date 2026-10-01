import { useEffect, useState } from 'react'
import { getTaskSummary, type TaskSummary } from './api'

const CHANGED = 'review-task-summary-changed'

/** Tells every `useTaskSummary` to read the summary again, after a decision changed the counts. */
export function notifyTaskSummaryChanged() {
  window.dispatchEvent(new Event(CHANGED))
}

/**
 * The open and overdue review counts for a badge. There is no notification feature, so the
 * badge is the reminder. A failure just means no badge: it is never worth an error message.
 */
export function useTaskSummary(isAllowed: boolean, refreshKey: string): TaskSummary | null {
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [changes, setChanges] = useState(0)

  useEffect(() => {
    const onChanged = () => setChanges((count) => count + 1)
    window.addEventListener(CHANGED, onChanged)
    return () => window.removeEventListener(CHANGED, onChanged)
  }, [])

  useEffect(() => {
    if (!isAllowed) return
    let cancelled = false
    getTaskSummary().then(
      (result) => !cancelled && setSummary(result),
      () => !cancelled && setSummary(null),
    )
    return () => {
      cancelled = true
    }
  }, [isAllowed, refreshKey, changes])

  return isAllowed ? summary : null
}
