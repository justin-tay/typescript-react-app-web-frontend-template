import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import type { CategoryStatus, PopulationEntry, ReviewItem, Task } from './api'
import { AuthContext } from '@/shared/session/auth-context'
import { reviewRoutes } from './routes'

/** A category with all of its accounts still pending, or `reviewed` of `total` decided. */
export const category = (reviewed: number, total: number): CategoryStatus => ({
  counts: { pending: total - reviewed, confirmed: reviewed, confirmedRolesEdited: 0, removed: 0 },
  progress: { reviewed, total },
})

export const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  type: 'privileged_account_review',
  status: 'open',
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
  overdue: false,
  active: category(0, 2),
  suspended: category(0, 1),
  removed: { confirmed: false },
  reportAvailable: false,
  ...overrides,
})

export const item = (overrides: Partial<ReviewItem> = {}): ReviewItem => ({
  id: 'i1',
  userId: 'u1',
  username: 'jtan',
  name: 'John Tan',
  department: 'Finance',
  lastActivityAt: '2026-08-26T00:00:00Z',
  roles: ['Users'],
  currentRoles: [{ id: 'r1', name: 'Users' }],
  privilegedPermissions: ['user:add-role'],
  outcome: 'pending',
  ownAccount: false,
  ...overrides,
})

export const entry: PopulationEntry = {
  userId: 'u9',
  username: 'old',
  name: 'Old Account',
  lastLoginAt: '2026-08-02T00:00:00Z',
  lastActivityAt: '2026-08-02T00:00:00Z',
  occurredAt: '2026-09-01T00:00:00Z',
  actor: 'system',
  reasonCode: 'inactive_account',
}

const page = <T,>(items: T[]) => ({ items, page: 0, size: 20, totalItems: items.length, totalPages: 1 })

export interface Stub {
  task: Task
  items: ReviewItem[]
  population: PopulationEntry[]
  /** Overrides the answer to a write, by `METHOD path`. */
  writes: Record<string, Response>
}

/** Answers the review endpoints and records every call as `METHOD path` with its JSON body. */
export function stubApi(stub: Partial<Stub> = {}) {
  const state: Stub = { task: task(), items: [item()], population: [entry], writes: {}, ...stub }
  const calls: { key: string; body: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input, 'http://localhost')
      const key = `${init?.method ?? 'GET'} ${url.pathname}`
      calls.push({ key, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      if (key in state.writes) return state.writes[key].clone()
      const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
      if (key === 'GET /api/account-reviews/tasks/t1') return json(state.task)
      if (key === 'GET /api/account-reviews/tasks/t1/items') return json(page(state.items))
      if (key === 'GET /api/account-reviews/tasks/t1/departments') return json(['Finance'])
      if (key.startsWith('GET /api/account-reviews/tasks/t1/populations/')) return json(page(state.population))
      if (key === 'GET /api/tasks/summary') return json({ openCount: 1, overdueCount: 0 })
      if (init?.method) return new Response(null, { status: 204 })
      return new Response('{}', { status: 404 })
    }),
  )
  return calls
}

/** Renders the review's routes at an address, as the app mounts them. */
/** What a reviewer who may decide, take roles away and remove accounts holds. */
export const REVIEWER = ['review:read', 'review:decide', 'user:remove-role', 'user:remove', 'user:read']

export function renderAt(path: string, permissions: string[] = REVIEWER) {
  const auth = {
    state: { status: 'authenticated' as const, user: { id: 'me', username: 'me', name: 'Me', permissions } },
    reload: async () => {},
    signOut: async () => {},
    expireSession: async () => {},
  }
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin">{reviewRoutes()}</Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}
