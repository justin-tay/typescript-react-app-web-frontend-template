import { apiRequest, listQuery, pathSegment, type ListParams, type Page } from '@/shared/lib/api-request'
import type { ReasonCode } from '@/shared/ui/reason-modal'

export { ValidationError, ReauthenticationRequiredError } from '@/shared/lib/api-errors'
export interface Summary {
  id: string
  name: string
}

/** The lifecycle status. A never-signed-in account is `active`; it simply has no `lastLoginAt`. */
export type UserStatus = 'active' | 'suspended'

export type { ReasonCode, ListParams, Page }

export interface AccountActionRequest {
  reasonCode: ReasonCode
  /** At most 200 characters. */
  note?: string
}

export interface AppUser {
  id: string
  username: string
  name: string
  email: string
  department?: string
  /** ISO instant; absent when the user has never signed in. */
  lastLoginAt?: string
  /** The later of the last sign-in and when the inactivity clock started (creation, or the last unsuspension). */
  lastActivityAt: string
  /** ISO instant, for the account's age; not for inactive days, since unsuspending restarts the clock. */
  createdAt: string
  status: UserStatus
  /** Present while suspended. */
  suspendedAt?: string
  suspensionReasonCode?: string
  suspensionNote?: string
  /** Read-only: whether any of the roles holds a privileged permission. */
  privileged: boolean
  roles: Summary[]
}

export interface PermissionSummary {
  id: string
  name: string
  /** Granting it needs the same permission, and it cannot be held together with review:decide. */
  privileged: boolean
}

export interface AppRole {
  id: string
  name: string
  permissions: PermissionSummary[]
}

/** Seeded and read-only. */
export interface AppPermission {
  id: string
  domain: string
  action: string
  name: string
  privileged: boolean
}

/** A fetch to `/api/admin/*`. */
const adminFetch = <T>(path: string, init?: RequestInit) => apiRequest<T>(`/admin${path}`, init)

// Users, requires user:read; a change needs the permission for what it does (see the backend's authorization doc).

export async function listUsers(params: ListParams): Promise<Page<AppUser>> {
  return adminFetch(`/users?${listQuery(params)}`)
}

export async function getUser(id: string): Promise<AppUser> {
  return adminFetch(`/users/${pathSegment(id)}`)
}

export interface UserWriteRequest {
  name: string
  email: string
  department?: string
  roleIds: string[]
}

export async function createUser(data: UserWriteRequest & { username: string }): Promise<AppUser> {
  return adminFetch('/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUser(id: string, data: UserWriteRequest): Promise<AppUser> {
  return adminFetch(`/users/${pathSegment(id)}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function suspendUser(id: string, request: AccountActionRequest): Promise<void> {
  await adminFetch(`/users/${pathSegment(id)}/suspend`, { method: 'POST', body: JSON.stringify(request) })
}

export async function unsuspendUser(id: string): Promise<void> {
  await adminFetch(`/users/${pathSegment(id)}/unsuspend`, { method: 'POST' })
}

/** Permanent: the account, its roles and passkeys are deleted; only the audit trail remains. */
export async function removeUser(id: string, request: AccountActionRequest): Promise<void> {
  await adminFetch(`/users/${pathSegment(id)}/remove`, { method: 'POST', body: JSON.stringify(request) })
}

// Roles, requires role:read.

export async function listRoles(params: ListParams): Promise<Page<AppRole>> {
  return adminFetch(`/roles?${listQuery(params)}`)
}

export async function getRole(id: string): Promise<AppRole> {
  return adminFetch(`/roles/${pathSegment(id)}`)
}

export interface RoleWriteRequest {
  name: string
  permissionIds: string[]
}

export async function createRole(data: RoleWriteRequest): Promise<AppRole> {
  return adminFetch('/roles', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateRole(id: string, data: RoleWriteRequest): Promise<AppRole> {
  return adminFetch(`/roles/${pathSegment(id)}`, { method: 'PUT', body: JSON.stringify(data) })
}

/** A role with users answers 409. */
export async function deleteRole(id: string): Promise<void> {
  await adminFetch(`/roles/${pathSegment(id)}`, { method: 'DELETE' })
}

// Permissions are seeded and read-only, requires permission:read. Filters: `domain`, `privileged`.

export async function listPermissions(params: ListParams): Promise<Page<AppPermission>> {
  return adminFetch(`/permissions?${listQuery(params)}`)
}
