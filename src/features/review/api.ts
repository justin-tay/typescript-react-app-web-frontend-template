import { apiRequest, listQuery, pathSegment, type ListParams, type Page } from '@/shared/lib/api-request'
import type { ReasonCode } from '@/shared/ui/reason-modal'

export type { ListParams, Page }

export type TaskStatus = 'open' | 'completed'
export type Outcome = 'pending' | 'confirmed' | 'confirmed_roles_edited' | 'removed'
export type TaskType = 'privileged_account_review' | 'non_privileged_account_review'
export type Population = 'suspended' | 'removed'
export type ReportFormat = 'pdf' | 'xlsx' | 'csv'

export interface Counts {
  pending: number
  confirmed: number
  confirmedRolesEdited: number
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
  /** Each review covers the accounts of its own class; the privileged one is monthly by default, the other yearly. */
  type: TaskType
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
  /** Both reviews have the suspended and removed lists, each confirmed once, even when empty. */
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
  /** Role names after the decision for a decided row. Frozen text, not ids. */
  roles: string[]
  /** The roles the account holds now, with ids, for a pending row; null once decided. Send the ids to keep. */
  currentRoles?: { id: string; name: string }[] | null
  /** Null while pending. */
  rolesBefore?: string[] | null
  /** The privileged permissions the account holds, why it is in the privileged review. Null in a non-privileged review. */
  privilegedPermissions?: string[] | null
  lastLoginAt?: string
  /** Counts the inactive days from: the later of the last sign-in and when the inactivity clock started. Frozen at the decision. */
  lastActivityAt: string
  outcome: Outcome
  /** English text from the server: no changes, the roles removed, or the removal with its reason. */
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
  /** Null for a removal recorded before the backend kept it: unknown, not zero. */
  lastActivityAt?: string | null
  /** When it was suspended or removed. */
  occurredAt: string
  /** A username, or `system`. */
  actor: string
  reasonCode?: string
  reasonNote?: string
}

export interface DecisionRequest {
  /** 1 to 100. Applied all or none. */
  itemIds: string[]
  decision: 'confirm' | 'remove'
  /** Required for `remove`, refused otherwise. */
  reasonCode?: ReasonCode
  note?: string
}

// Reading needs review:read, deciding review:decide, confirming a list review:confirm-population,
// downloading a report review:download-report.

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

/** The active accounts. Filters: `outcome`, `department`, `role` (a role name). */
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

/** Confirm or remove several items at once. A `409` message names the items that blocked it. */
export function decide(taskId: string, request: DecisionRequest): Promise<void> {
  return apiRequest(`${taskPath(taskId)}/decisions`, { method: 'POST', body: JSON.stringify(request) })
}

/**
 * Saves the roles the account should keep, which confirms the item. A reviewer can only remove: a role the account does
 * not hold is 403, an unchanged set is 400 and an empty set is 400. Needs `user:remove-role` besides `review:decide`.
 */
export function editRoles(taskId: string, itemId: string, roleIds: string[]): Promise<void> {
  return apiRequest(`${taskPath(taskId)}/items/${pathSegment(itemId)}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds }),
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
