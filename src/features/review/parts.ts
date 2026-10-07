import type { CategoryStatus, ItemCategory, Population, PopulationStatus, Task } from './api'

export type PartKey = ItemCategory | Population

/** Where the reviews are, and each review under it. */
export const REVIEWS_PATH = '/admin/reviews'

/**
 * The parts every review is made of, in the order they are shown. A part's key is also the last segment of its
 * address under the review. `name` is the short form for where several parts sit side by side.
 */
export const PARTS = [
  { key: 'active', kind: 'category', name: 'Active', title: 'Active accounts' },
  { key: 'suspended', kind: 'category', name: 'Suspended', title: 'Suspended accounts' },
  { key: 'removed', kind: 'population', name: 'Removed', title: 'Removed accounts' },
] as const satisfies readonly { key: PartKey; kind: 'category' | 'population'; name: string; title: string }[]

const partOf = (key: PartKey) => PARTS.find((part) => part.key === key)!

export const partTitle = (key: PartKey) => partOf(key).title

/** A review's page, or the page of one of its parts. */
export const reviewHref = (taskId: string, key?: PartKey) =>
  `${REVIEWS_PATH}/${encodeURIComponent(taskId)}${key ? `/${key}` : ''}`

interface PartBase {
  name: string
  title: string
  href: string
  /** Every account in it is decided, or its list is confirmed. A category with no accounts is done. */
  isDone: boolean
}

/** One part of a task and how it stands. */
export type Part =
  | (PartBase & { kind: 'category'; key: ItemCategory; status: CategoryStatus })
  | (PartBase & { kind: 'population'; key: Population; status: PopulationStatus })

/** What the reviewer does next with a review. */
export type NextStep = 'start' | 'continue' | 'view'

export interface Standing {
  parts: Part[]
  doneCount: number
  /** Every part is done. The server then completes the review, so an open one shows it only briefly. */
  isDone: boolean
  /** Active and suspended accounts still to decide. */
  accountsLeft: number
  /** Any part has progress: an account decided or the removed list confirmed. */
  isStarted: boolean
  next: NextStep
}

/** How a review stands: each part, how many are done and what to do next. */
export function standing(task: Task): Standing {
  const parts = PARTS.map((info): Part => {
    const href = reviewHref(task.id, info.key)
    if (info.kind === 'category') {
      const status = task[info.key]
      const isDone = status.progress.reviewed >= status.progress.total
      return { ...info, href, status, isDone }
    }
    const status = task[info.key]
    return { ...info, href, status, isDone: status.confirmed }
  })
  const categories = parts.filter((part) => part.kind === 'category')
  const doneCount = parts.filter((part) => part.isDone).length
  const isStarted = categories.some((part) => part.status.progress.reviewed > 0) || task.removed.confirmed
  return {
    parts,
    doneCount,
    isDone: doneCount === parts.length,
    accountsLeft: categories.reduce((sum, part) => sum + part.status.progress.total - part.status.progress.reviewed, 0),
    isStarted,
    next: task.status === 'completed' ? 'view' : isStarted ? 'continue' : 'start',
  }
}

/** Where an address sits among the reviews, for the breadcrumb: a review's page, or one of its parts. */
export function reviewCrumb(pathname: string): { taskHref: string; partTitle?: string } | null {
  const [taskId, segment, ...rest] = pathname.startsWith(`${REVIEWS_PATH}/`)
    ? pathname.slice(REVIEWS_PATH.length + 1).split('/')
    : []
  if (!taskId || rest.length > 0) return null
  const taskHref = `${REVIEWS_PATH}/${taskId}`
  if (segment === undefined) return { taskHref }
  const part = PARTS.find((p) => p.key === segment)
  return part ? { taskHref, partTitle: part.title } : null
}
