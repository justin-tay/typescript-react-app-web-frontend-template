import { apiRequest, listQuery, type ListParams, type Page } from '@/shared/lib/api-request'

export const AUDIT_TARGET_TYPES = ['USER', 'ROLE', 'SETTING', 'REVIEW'] as const
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number]

/**
 * One entry of the business audit trail. `details` holds what changed (`before`, `changes`)
 * and the access added and removed (`rolesAdded`, `rolesRemoved`, `permissionsAdded`,
 * `permissionsRemoved`), with `roles`, `permissions` and `privileged` for a user or role; it never holds an email address, and which keys are present depends on the action.
 */
export interface AuditEvent {
  id: string
  occurredAt: string
  /** A username, or `system` for the scheduled jobs. */
  actor: string
  action: string
  targetType: AuditTargetType
  targetId?: string
  targetName?: string
  /** Filled for users, so a removed account is still recognisable. */
  targetDisplayName?: string
  reasonCode?: string
  reasonNote?: string
  details?: Record<string, unknown>
}

// Requires audit:read. Read-only: there is no way to change an event.

export function listAuditEvents(params: ListParams): Promise<Page<AuditEvent>> {
  return apiRequest(`/audit-events?${listQuery(params)}`)
}
