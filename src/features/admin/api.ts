import { apiRequest, listQuery, type ListParams, type Page } from '@/shared/lib/api-request'
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
  /** ISO instant; absent when the user has never signed in. */
  lastLoginAt?: string
  status: UserStatus
  /** Present while suspended. */
  suspendedAt?: string
  suspensionReasonCode?: string
  suspensionNote?: string
  groups: Summary[]
}

/** `name` is the identifier and the authority; show `displayName`. */
export interface AppRole {
  id: string
  name: string
  displayName: string
}

export interface AppGroup {
  id: string
  name: string
  roles: AppRole[]
}

/** A fetch to `/api/admin/*`. */
const adminFetch = <T>(path: string, init?: RequestInit) => apiRequest<T>(`/admin${path}`, init)

// Users, requires USER_MANAGE.

export async function listUsers(params: ListParams): Promise<Page<AppUser>> {
  return adminFetch(`/users?${listQuery(params)}`)
}

export async function getUser(id: string): Promise<AppUser> {
  return adminFetch(`/users/${id}`)
}

export interface UserWriteRequest {
  name: string
  email: string
  groupIds: string[]
}

export async function createUser(data: UserWriteRequest & { username: string }): Promise<AppUser> {
  return adminFetch('/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUser(id: string, data: UserWriteRequest): Promise<AppUser> {
  return adminFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function suspendUser(id: string, request: AccountActionRequest): Promise<void> {
  await adminFetch(`/users/${id}/suspend`, { method: 'POST', body: JSON.stringify(request) })
}

export async function unsuspendUser(id: string): Promise<void> {
  await adminFetch(`/users/${id}/unsuspend`, { method: 'POST' })
}

/** Permanent: the account, its memberships and passkeys are deleted; only the audit trail remains. */
export async function removeUser(id: string, request: AccountActionRequest): Promise<void> {
  await adminFetch(`/users/${id}/remove`, { method: 'POST', body: JSON.stringify(request) })
}

// Groups, requires GROUP_MANAGE.

export async function listGroups(params: ListParams): Promise<Page<AppGroup>> {
  return adminFetch(`/groups?${listQuery(params)}`)
}

export async function getGroup(id: string): Promise<AppGroup> {
  return adminFetch(`/groups/${id}`)
}

export interface GroupWriteRequest {
  name: string
  roleIds: string[]
}

export async function createGroup(data: GroupWriteRequest): Promise<AppGroup> {
  return adminFetch('/groups', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateGroup(id: string, data: GroupWriteRequest): Promise<AppGroup> {
  return adminFetch(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteGroup(id: string): Promise<void> {
  await adminFetch(`/groups/${id}`, { method: 'DELETE' })
}

// Roles are read-only here: they exist to be granted by groups, so the group form lists them
// and there is no page to edit them.

export async function listRoles(params: ListParams): Promise<Page<AppRole>> {
  return adminFetch(`/roles?${listQuery(params)}`)
}
