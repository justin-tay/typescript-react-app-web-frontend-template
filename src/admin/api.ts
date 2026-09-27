import { csrfHeaders } from '../lib/csrf'

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

export class AdminApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** A write rejected because the fields didn't validate; `fieldErrors` keys are field names. */
export class ValidationError extends AdminApiError {
  readonly fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message, 400)
    this.fieldErrors = fieldErrors
  }
}

/**
 * A write rejected because the signed-in user's login is older than the backend allows for
 * administration changes (see docs/adr/0023 in the backend). The caller should send the
 * browser to log in again with `beginReauthentication` from `./reauth`.
 */
export class ReauthenticationRequiredError extends AdminApiError {
  constructor() {
    super('Please log in again to make this change.', 401)
  }
}

interface ProblemDetailBody {
  type?: string
  detail?: string
  errors?: { message: string; source?: { pointer?: string } }[]
}

function problemType(problem: ProblemDetailBody | null): string | undefined {
  return problem?.type?.replace(/^urn:problem:/, '')
}

async function readProblem(response: Response): Promise<ProblemDetailBody | null> {
  try {
    return (await response.json()) as ProblemDetailBody
  } catch {
    return null
  }
}

async function throwForResponse(response: Response): Promise<never> {
  const problem = await readProblem(response)
  if (response.status === 401 && problemType(problem) === 'reauthentication-required') {
    throw new ReauthenticationRequiredError()
  }
  if (response.status === 401) throw new AdminApiError('You are not logged in.', 401)
  if (response.status === 403) throw new AdminApiError('You do not have permission to do this.', 403)
  if (response.status === 400 && problem?.errors) {
    const fieldErrors: Record<string, string> = {}
    for (const error of problem.errors) {
      const field = error.source?.pointer?.replace(/^\//, '')
      if (field) fieldErrors[field] = error.message
    }
    throw new ValidationError(problem.detail ?? 'One or more fields are invalid.', fieldErrors)
  }
  throw new AdminApiError(problem?.detail ?? `The request failed (HTTP ${response.status}).`, response.status)
}

/** A fetch to `/api/admin/*`, with the CSRF header on writes and the error mapping above. */
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
