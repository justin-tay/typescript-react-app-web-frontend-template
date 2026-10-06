import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from './api'
import { ReviewDashboard } from './ReviewDashboard'

const task = (overrides: Partial<Task>): Task => ({
  id: 't1',
  type: 'privileged_account_review',
  status: 'open',
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
  overdue: false,
  counts: { pending: 2, confirmed: 1, confirmedRolesEdited: 0, removed: 0 },
  progress: { reviewed: 1, total: 3 },
  populations: { suspended: { confirmed: false }, removed: { confirmed: false } },
  reportAvailable: false,
  ...overrides,
})

function stubTasks(items: Task[]) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ items, page: 0, size: 20, totalItems: items.length, totalPages: 1 })),
      ),
  )
}

describe('ReviewDashboard', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('lists tasks with an open, overdue or completed badge and their progress', async () => {
    stubTasks([
      task({ id: 'a', startDate: '2026-10-01', overdue: true }),
      task({ id: 'b', startDate: '2026-09-01', dueDate: '2026-09-30', status: 'open' }),
      task({
        id: 'c',
        startDate: '2026-08-01',
        dueDate: '2026-08-31',
        status: 'completed',
        completedAt: '2026-08-20T10:00:00Z',
        completedBy: 'system',
        progress: { reviewed: 3, total: 3 },
      }),
    ])
    render(
      <MemoryRouter>
        <ReviewDashboard />
      </MemoryRouter>,
    )

    expect((await screen.findAllByText('Overdue')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Open').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1 of 3').length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('link', { name: /Privileged account review, 1 Oct 2026 to 31 Oct 2026/ })[0],
    ).toHaveAttribute('href', '/admin/reviews/a')
  })

  it('offers the next step on each row: start, continue or view', async () => {
    stubTasks([
      task({ id: 'a', progress: { reviewed: 0, total: 3 } }),
      task({ id: 'b', progress: { reviewed: 2, total: 3 } }),
      task({ id: 'c', status: 'completed', progress: { reviewed: 3, total: 3 } }),
    ])
    render(
      <MemoryRouter>
        <ReviewDashboard />
      </MemoryRouter>,
    )

    expect((await screen.findAllByRole('link', { name: /^Start review:/ }))[0]).toHaveAttribute(
      'href',
      '/admin/reviews/a',
    )
    expect(screen.getAllByRole('link', { name: /^Continue:/ })[0]).toHaveAttribute('href', '/admin/reviews/b')
    expect(screen.getAllByRole('link', { name: /^View:/ })[0]).toHaveAttribute('href', '/admin/reviews/c')
  })

  it('says when there are no reviews', async () => {
    stubTasks([])
    render(
      <MemoryRouter>
        <ReviewDashboard />
      </MemoryRouter>,
    )
    expect((await screen.findAllByText(/No open reviews/)).length).toBeGreaterThan(0)
  })
})
