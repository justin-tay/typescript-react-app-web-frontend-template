import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import type { PopulationEntry, ReviewItem, Task } from './api'
import { ReviewOverview } from './ReviewOverview'
import { ActiveAccountsPage, PopulationPage } from './ReviewSections'

export const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  type: 'account_review',
  status: 'open',
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
  overdue: false,
  counts: { pending: 2, confirmed: 0, confirmedGroupsEdited: 0, removed: 0 },
  progress: { reviewed: 0, total: 2 },
  populations: { suspended: { confirmed: false }, removed: { confirmed: false } },
  reportAvailable: false,
  ...overrides,
})

export const item = (overrides: Partial<ReviewItem> = {}): ReviewItem => ({
  id: 'i1',
  userId: 'u1',
  username: 'jtan',
  name: 'John Tan',
  department: 'Finance',
  groups: ['Users'],
  outcome: 'pending',
  ownAccount: false,
  ...overrides,
})

export const entry: PopulationEntry = {
  userId: 'u9',
  username: 'old',
  name: 'Old Account',
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
      if (key === 'GET /api/account-reviews/groups') {
        return json([
          { id: 'g1', name: 'Users' },
          { id: 'g2', name: 'Viewers' },
        ])
      }
      if (key.startsWith('GET /api/account-reviews/tasks/t1/populations/')) return json(page(state.population))
      if (key === 'GET /api/tasks/summary') return json({ openCount: 1, overdueCount: 0 })
      if (init?.method) return new Response(null, { status: 204 })
      return new Response('{}', { status: 404 })
    }),
  )
  return calls
}

/** Renders the review's routes at an address, as the app mounts them. */
export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/reviews/:taskId" element={<ReviewOverview />} />
        <Route path="/admin/reviews/:taskId/active" element={<ActiveAccountsPage />} />
        <Route path="/admin/reviews/:taskId/suspended" element={<PopulationPage population="suspended" />} />
        <Route path="/admin/reviews/:taskId/removed" element={<PopulationPage population="removed" />} />
      </Routes>
    </MemoryRouter>,
  )
}
