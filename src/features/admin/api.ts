import { noteServerActivity } from '@/shared/session/session-timeout'
import { apiFetch } from '@/shared/lib/api-fetch'
import { ApiError, throwForResponse } from '@/shared/lib/api-errors'

export { ValidationError, ReauthenticationRequiredError } from '@/shared/lib/api-errors'
// Re-exported as both a value and a type, so `instanceof AdminApiError` and
// `AdminApiError` as a type annotation both still work for the admin pages.
export const AdminApiError = ApiError
export type AdminApiError = ApiError

export interface Summary {
  id: string
  name: string
}

/** `pending` is enabled but never signed in; derived by the backend (ADR 0028). */
export type UserStatus = 'active' | 'disabled' | 'pending'

export interface AppUser {
  id: string
  username: string
  name: string
  email: string
  enabled: boolean
  /** ISO instant; absent when the user has never signed in. */
  lastLoginAt?: string
  status: UserStatus
  groups: Summary[]
}

export interface AppGroup {
  id: string
  name: string
  roles: Summary[]
}

export interface AppRole {
  id: string
  name: string
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/**
 * Query for one page of a list endpoint (backend ADR 0027). `sort` entries are
 * `property,asc|desc`, sent as repeated `sort` params (at most 3). `filters` holds the
 * endpoint's per-field filters; empty values are left out.
 */
export interface ListParams {
  /** 0-based. */
  page: number
  size: number
  sort?: string[]
  search?: string
  filters?: Record<string, string>
}

/** A fetch to `/api/admin/*`, with the CSRF header on writes and the shared error mapping. */
async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isWrite = (init?.method ?? 'GET') !== 'GET'
  const response = await apiFetch(`/api/admin${path}`, {
    ...init,
    headers: { ...(isWrite ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) return throwForResponse(response)
  noteServerActivity()
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function listQuery(params: ListParams): string {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) })
  for (const sort of params.sort ?? []) query.append('sort', sort)
  if (params.search) query.set('search', params.search)
  for (const [name, value] of Object.entries(params.filters ?? {})) {
    if (value !== '') query.set(name, value)
  }
  return query.toString()
}

// Users, requires USER_MANAGE.

export async function listUsers(params: ListParams): Promise<Page<AppUser>> {
  return adminFetch(`/users?${listQuery(params)}`)
}

export interface UserWriteRequest {
  name: string
  email: string
  enabled: boolean
  groupIds: string[]
}

export async function createUser(data: UserWriteRequest & { username: string }): Promise<AppUser> {
  return adminFetch('/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateUser(id: string, data: UserWriteRequest): Promise<AppUser> {
  return adminFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteUser(id: string): Promise<void> {
  await adminFetch(`/users/${id}`, { method: 'DELETE' })
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

// Roles, requires ROLE_MANAGE. No update: a role is just a name, so it is deleted and
// recreated rather than renamed (see RoleAdminController in the backend).

export async function listRoles(params: ListParams): Promise<Page<AppRole>> {
  return adminFetch(`/roles?${listQuery(params)}`)
}

export async function createRole(data: { name: string }): Promise<AppRole> {
  return adminFetch('/roles', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteRole(id: string): Promise<void> {
  await adminFetch(`/roles/${id}`, { method: 'DELETE' })
}
