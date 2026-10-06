import type { Task } from './api'

const DAY_MS = 24 * 60 * 60 * 1000

/** How soon an open review counts as "due soon". */
export const DUE_SOON_DAYS = 7

/** Whole days from `today` to an ISO date (`2026-10-31`): negative once it has passed. Both read as UTC dates. */
export function daysUntil(isoDate: string, today: Date = new Date()): number {
  const due = Date.parse(`${isoDate}T00:00:00Z`)
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return Math.round((due - start) / DAY_MS)
}

const plural = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

export interface DueHint {
  text: string
  tone: 'overdue' | 'soon' | 'later'
}

/** The "in 24 days" under a due date; none for a completed review, which has nothing left to do by then. */
export function dueHint(task: Pick<Task, 'status' | 'dueDate' | 'overdue'>, today: Date = new Date()): DueHint | null {
  if (task.status === 'completed') return null
  const days = daysUntil(task.dueDate, today)
  if (task.overdue || days < 0) return { text: `${plural(Math.abs(days))} overdue`, tone: 'overdue' }
  if (days === 0) return { text: 'due today', tone: 'soon' }
  return { text: `in ${plural(days)}`, tone: days <= DUE_SOON_DAYS ? 'soon' : 'later' }
}
