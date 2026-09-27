import { csrfHeaders } from '../lib/csrf'
import { ApiError, throwForResponse } from '../lib/api-errors'

export { ValidationError, ReauthenticationRequiredError } from '../lib/api-errors'
// Re-exported as both a value and a type, so `instanceof AdminApiError` and
// `AdminApiError` as a type annotation both still work for the admin pages.
export const AdminApiError = ApiError
export type AdminApiError = ApiError

export interface Summary {
  id: string
  name: string
}

export interface AppUser {
  id: string
  username: string
  displayName: string
  email: string
  enabled: boolean
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

export interface ListParams {
  page: number
  size: number
  sort?: string
}

/** A fetch to `/api/admin/*`, with the CSRF header on writes and the shared error mapping. */
async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET'
  const isWrite = method !== 'GET'
  const response = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(isWrite ? { 'Content-Type': 'application/json', ...csrfHeaders() } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) return throwForResponse(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function listQuery(params: ListParams): string {
  const search = new URLSearchParams({ page: String(params.page), size: String(params.size) })
  if (params.sort !== undefined) search.set('sort', params.sort)
  return search.toString()
}

// Users, requires USER_MANAGE.

export async function listUsers(params: ListParams): Promise<Page<AppUser>> {
  return adminFetch(`/users?${listQuery(params)}`)
}

export interface UserWriteRequest {
  displayName: string
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
