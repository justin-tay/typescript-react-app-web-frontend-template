export interface AppUserGroup {
  id: string
  name: string
}

export interface AppUser {
  id: string
  username: string
  displayName: string
  email: string
  enabled: boolean
  groups: AppUserGroup[]
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

export class AdminApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export interface ListUsersParams {
  page: number
  size: number
  sort?: string
}

/** GET /admin/users, requires the USER_MANAGE authority. */
export async function listUsers(params: ListUsersParams): Promise<Page<AppUser>> {
  const query = new URLSearchParams({
    page: String(params.page),
    size: String(params.size),
    ...(params.sort ? { sort: params.sort } : {}),
  })
  const response = await fetch(`/api/admin/users?${query}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    if (response.status === 401) throw new AdminApiError('You are not logged in.', 401)
    if (response.status === 403) {
      throw new AdminApiError('You do not have permission to manage users.', 403)
    }
    throw new AdminApiError(`Could not load users (HTTP ${response.status}).`, response.status)
  }
  return (await response.json()) as Page<AppUser>
}
