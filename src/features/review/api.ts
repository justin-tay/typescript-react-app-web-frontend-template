import { apiRequest, listQuery, pathSegment, type ListParams, type Page } from '@/shared/lib/api-request'
import type { ReasonCode } from '@/shared/ui/reason-modal'

export type { ListParams, Page }

export type TaskStatus = 'open' | 'completed'
export type ReviewStatus = 'pending_verification' | 'verified' | 'removed'
export type ReviewCategory = 'active' | 'suspended' | 'removed'

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
  completedBy?: string
  /** Open and past its due date. */
  overdue: boolean
  /** Items in each review status; a status with none may be absent. */
  counts: Partial<Record<ReviewStatus, number>>
}

export interface TaskSummary {
  openCount: number
  earliestDueDate?: string
  overdueCount: number
}

/**
 * One row of a task. Which fields are filled depends on the category: active rows have
 * `lastLoginAt`, suspended rows `suspendedAt`, removed rows `removedAt` and `removedBy`;
 * suspended and removed rows also have the reason. A removed row's `id` is the removal's
 * audit event, not a review item, so it cannot be decided on.
 */
export interface ReviewItem {
  id: string
  userId: string
  username: string
  name: string
  category: ReviewCategory
  /** Null on a removed row: it comes from the removal's audit event, which has no review status. */
  reviewStatus?: ReviewStatus | null
  /** The signed-in reviewer's own account: every action on it is refused. */
  ownAccount: boolean
  lastLoginAt?: string
  suspendedAt?: string
  removedAt?: string
  removedBy?: string
  reasonCode?: string
  reasonNote?: string
  decidedBy?: string
  decidedAt?: string
}

export interface ItemListParams extends ListParams {
  /** Required by the API: each category is its own list. */
  category: ReviewCategory
}

export interface DecisionRequest {
  /** 1 to 100. Applied all or none. */
  itemIds: string[]
  decision: 'verify' | 'remove'
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

export function getTask(taskId: string): Promise<Task> {
  return apiRequest(`/account-reviews/tasks/${pathSegment(taskId)}`)
}

export function listItems(taskId: string, { category, ...params }: ItemListParams): Promise<Page<ReviewItem>> {
  return apiRequest(
    `/account-reviews/tasks/${pathSegment(taskId)}/items?${listQuery({ ...params, filters: { ...params.filters, category } })}`,
  )
}

/** Verify or remove several items at once. A `409` message names the items that blocked it. */
export function decide(taskId: string, request: DecisionRequest): Promise<void> {
  return apiRequest(`/account-reviews/tasks/${pathSegment(taskId)}/decisions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/** Suspending and unsuspending leave the item's review status as it was. */
export function suspendItem(
  taskId: string,
  itemId: string,
  request: { reasonCode: ReasonCode; note?: string },
): Promise<void> {
  return apiRequest(`/account-reviews/tasks/${pathSegment(taskId)}/items/${pathSegment(itemId)}/suspend`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function unsuspendItem(taskId: string, itemId: string): Promise<void> {
  return apiRequest(`/account-reviews/tasks/${pathSegment(taskId)}/items/${pathSegment(itemId)}/unsuspend`, {
    method: 'POST',
  })
}
