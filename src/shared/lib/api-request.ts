import { noteServerActivity } from '@/shared/session/session-timeout'
import { apiFetch } from './api-fetch'
import { throwForResponse } from './api-errors'

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

export function listQuery(params: ListParams): string {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) })
  for (const sort of params.sort ?? []) query.append('sort', sort)
  if (params.search) query.set('search', params.search)
  for (const [name, value] of Object.entries(params.filters ?? {})) {
    if (value !== '') query.set(name, value)
  }
  return query.toString()
}

/** A fetch to `/api/...` with the CSRF header on writes, a JSON body, and the shared error mapping. */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isWrite = (init?.method ?? 'GET') !== 'GET'
  const response = await apiFetch(`/api${path}`, {
    ...init,
    headers: { ...(isWrite && init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) return throwForResponse(response)
  noteServerActivity()
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
