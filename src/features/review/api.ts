import { apiRequest, listQuery, pathSegment, type ListParams, type Page } from '@/shared/lib/api-request'
import type { ReasonCode } from '@/shared/ui/reason-modal'

export type { ListParams, Page }

export type TaskStatus = 'open' | 'completed'
export type Outcome = 'pending' | 'confirmed' | 'confirmed_groups_edited' | 'removed'
export type Population = 'suspended' | 'removed'
export type ReportFormat = 'pdf' | 'xlsx' | 'csv'

export interface Counts {
  pending: number
  confirmed: number
  confirmedGroupsEdited: number
  removed: number
}

/** The decided accounts out of those in the active category. */
export interface Progress {
  reviewed: number
  total: number
}

export interface PopulationStatus {
  confirmed: boolean
  confirmedBy?: string
  /** ISO instant. */
  confirmedAt?: string
  note?: string
  /** How many accounts the confirmed list held; null until confirmed (the server sends nulls, not absent fields). */
  count?: number
}

export interface Task {
  id: string
  /** Only `account_review` exists today; the dashboard lists any type without change. */
  type: string
  status: TaskStatus
  /** ISO dates. */
  startDate: string
  dueDate: string
  /** ISO instant; absent until completed. */
  completedAt?: string
  /** A username, or `system` when the scheduled job completed it. */
  completedBy?: string
  /** Open and past its due date. */
  overdue: boolean
  counts: Counts
  progress: Progress
  populations: { suspended: PopulationStatus; removed: PopulationStatus }
  /** The stored report exists, which it does once the task is completed. */
  reportAvailable: boolean
}

export interface TaskSummary {
  openCount: number
  earliestDueDate?: string
  overdueCount: number
}

/** One active account. A pending row is live; a decided row shows what was frozen at the decision. */
export interface ReviewItem {
  id: string
  userId: string
  username: string
  name: string
  department?: string
  /** Group names after the decision for a decided row. Frozen text, not ids. */
  groups: string[]
  /** Null while pending. */
  groupsBefore?: string[] | null
  lastLoginAt?: string
  outcome: Outcome
  /** English text from the server: no changes, the groups added and removed, or the removal with its reason. */
  remark?: string
  /** The signed-in reviewer's own account: every action on it is refused. */
  ownAccount: boolean
  decidedBy?: string
  decidedAt?: string
}

/** One account of the suspended or removed list. */
export interface PopulationEntry {
  userId: string
  username: string
  name: string
  department?: string
  lastLoginAt?: string
  /** When it was suspended or removed. */
  occurredAt: string
  /** A username, or `system`. */
  actor: string
  reasonCode?: string
  reasonNote?: string
}

export interface AssignableGroup {
  id: string
  name: string
}

export interface DecisionRequest {
  /** 1 to 100. Applied all or none. */
  itemIds: string[]
  decision: 'confirm' | 'remove'
  /** Required for `remove`, refused otherwise. */
  reasonCode?: ReasonCode
  note?: string
}

// Requires ACCOUNT_REVIEWER.

export function listTasks(params: ListParams): Promise<Page<Task>> {
  return apiRequest(`/tasks?${listQuery(params)}`)
}

/** For a badge or banner: no notification feature exists. */
export function getTaskSummary(): Promise<TaskSummary> {
  return apiRequest('/tasks/summary')
}

const taskPath = (taskId: string) => `/account-reviews/tasks/${pathSegment(taskId)}`

export function getTask(taskId: string): Promise<Task> {
  return apiRequest(taskPath(taskId))
}

/** The active accounts. Filters: `outcome`, `department`, `group` (a group name). */
export function listItems(taskId: string, params: ListParams): Promise<Page<ReviewItem>> {
  return apiRequest(`${taskPath(taskId)}/items?${listQuery(params)}`)
}

export function listPopulation(
  taskId: string,
  population: Population,
  params: ListParams,
): Promise<Page<PopulationEntry>> {
  return apiRequest(`${taskPath(taskId)}/populations/${population}?${listQuery(params)}`)
}

/** How many accounts a population holds now, for its card: the total of a one-row page. */
export async function countPopulation(taskId: string, population: Population): Promise<number> {
  return (await listPopulation(taskId, population, { page: 0, size: 1 })).totalItems
}

/** The distinct departments shown in the task, for the filter. */
export function listDepartments(taskId: string): Promise<string[]> {
  return apiRequest(`${taskPath(taskId)}/departments`)
}

/** The groups this reviewer may assign. */
export function listAssignableGroups(): Promise<AssignableGroup[]> {
  return apiRequest('/account-reviews/groups')
}

/** Confirm or remove several items at once. A `409` message names the items that blocked it. */
export function decide(taskId: string, request: DecisionRequest): Promise<void> {
  return apiRequest(`${taskPath(taskId)}/decisions`, { method: 'POST', body: JSON.stringify(request) })
}

/** Saves the full set of groups the account should hold, which confirms the item. */
export function editGroups(taskId: string, itemId: string, groupIds: string[]): Promise<void> {
  return apiRequest(`${taskPath(taskId)}/items/${pathSegment(itemId)}/groups`, {
    method: 'PUT',
    body: JSON.stringify({ groupIds }),
  })
}

/** Confirms a list as reviewed, once. */
export function confirmPopulation(taskId: string, population: Population, note?: string): Promise<void> {
  return apiRequest(`${taskPath(taskId)}/populations/${population}/confirmation`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  })
}

/**
 * Where a report downloads from. A plain link: the server answers with an attachment, a draft while
 * the task is open, and every download is recorded in the audit trail, so nothing fetches it ahead.
 */
export function reportUrl(taskId: string, format: ReportFormat): string {
  return `/api${taskPath(taskId)}/report?format=${format}`
}
