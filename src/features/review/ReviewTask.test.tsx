import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PopulationEntry, ReviewItem, Task } from './api'
import { ReviewTask } from './ReviewTask'

const task = (overrides: Partial<Task> = {}): Task => ({
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

const item = (overrides: Partial<ReviewItem> = {}): ReviewItem => ({
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

const entry: PopulationEntry = {
  userId: 'u9',
  username: 'old',
  name: 'Old Account',
  occurredAt: '2026-09-01T00:00:00Z',
  actor: 'system',
  reasonCode: 'inactive_account',
}

const page = <T,>(items: T[]) => ({ items, page: 0, size: 20, totalItems: items.length, totalPages: 1 })

interface Stub {
  task: Task
  items: ReviewItem[]
  population: PopulationEntry[]
  /** Overrides the answer to a write, by `METHOD path`. */
  writes: Record<string, Response>
}

/** Answers the review endpoints and records every call as `METHOD path` with its JSON body. */
function stubApi(stub: Partial<Stub> = {}) {
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

function renderTask() {
  return render(
    <MemoryRouter initialEntries={['/admin/reviews/t1']}>
      <Routes>
        <Route path="/admin/reviews/:taskId" element={<ReviewTask />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ReviewTask', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.cookie = 'XSRF-TOKEN=abc'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows the period, the progress and the three lists', async () => {
    stubApi({ task: task({ progress: { reviewed: 1, total: 4 } }) })
    renderTask()

    expect(await screen.findByRole('heading', { name: 'Account review' })).toBeInTheDocument()
    expect(screen.getByText('1 Oct 2026 to 31 Oct 2026')).toBeInTheDocument()
    expect(screen.getByText('1 / 4 reviewed (25%)')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Active accounts/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Suspended accounts/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Removed accounts/ })).toBeInTheDocument()
  })

  it('copes with the nulls the server sends for what is not there yet', async () => {
    stubApi({
      task: task({
        completedAt: null,
        completedBy: null,
        populations: {
          suspended: { confirmed: false, confirmedBy: null, confirmedAt: null, note: null, count: null },
          removed: { confirmed: false, confirmedBy: null, confirmedAt: null, note: null, count: null },
        },
      } as unknown as Partial<Task>),
      items: [
        item({
          department: null,
          remark: null,
          lastLoginAt: null,
          groupsBefore: null,
        } as unknown as Partial<ReviewItem>),
      ],
    })
    renderTask()

    expect(await screen.findByRole('tab', { name: /Suspended accounts/ })).toBeInTheDocument()
    expect((await screen.findAllByText('John Tan')).length).toBeGreaterThan(0)
  })

  it('says so when the review does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })))
    renderTask()
    expect(await screen.findByText('This review does not exist.')).toBeInTheDocument()
  })

  describe('active accounts', () => {
    it('lists the accounts with their groups, outcome and row actions', async () => {
      stubApi({
        items: [
          item(),
          item({
            id: 'i2',
            username: 'mlim',
            name: 'Mary Lim',
            outcome: 'confirmed_groups_edited',
            remark: 'Added Viewers',
          }),
        ],
      })
      renderTask()

      expect((await screen.findAllByText('John Tan')).length).toBeGreaterThan(0)
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Confirmed (Groups Edited)').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Added Viewers').length).toBeGreaterThan(0)
      expect(screen.getAllByRole('button', { name: 'Confirm jtan' }).length).toBeGreaterThan(0)
      // A decided row has nothing left to do.
      expect(screen.queryByRole('button', { name: 'Confirm mlim' })).toBeNull()
    })

    it('disables every action on your own account and says why', async () => {
      stubApi({ items: [item({ ownAccount: true })] })
      renderTask()

      expect((await screen.findAllByText('John Tan')).length).toBeGreaterThan(0)
      for (const name of ['Confirm jtan', 'Edit groups of jtan', 'Remove jtan']) {
        for (const button of screen.getAllByRole('button', { name })) expect(button).toBeDisabled()
      }
      expect(screen.getAllByText('You cannot review your own account.').length).toBeGreaterThan(0)
    })

    it('confirms one account', async () => {
      const calls = stubApi()
      renderTask()
      await screen.findAllByText('John Tan')

      await userEvent.click(screen.getAllByRole('button', { name: 'Confirm jtan' })[0])
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))

      await waitFor(() =>
        expect(calls).toContainEqual({
          key: 'POST /api/account-reviews/tasks/t1/decisions',
          body: { itemIds: ['i1'], decision: 'confirm' },
        }),
      )
    })

    it('removes one account with a reason', async () => {
      const calls = stubApi()
      renderTask()
      await screen.findAllByText('John Tan')

      await userEvent.click(screen.getAllByRole('button', { name: 'Remove jtan' })[0])
      const dialog = await screen.findByRole('dialog')
      const submit = within(dialog).getByRole('button', { name: 'Remove' })
      expect(submit).toBeDisabled()
      await userEvent.click(within(dialog).getByRole('button', { name: /Reason/ }))
      await userEvent.click(await screen.findByRole('option', { name: 'Left the organisation' }))
      await userEvent.click(submit)

      await waitFor(() =>
        expect(calls).toContainEqual({
          key: 'POST /api/account-reviews/tasks/t1/decisions',
          body: { itemIds: ['i1'], decision: 'remove', reasonCode: 'left_organisation' },
        }),
      )
    })

    it('shows the server message when another reviewer got there first', async () => {
      stubApi({
        writes: {
          'POST /api/account-reviews/tasks/t1/decisions': new Response(
            JSON.stringify({ title: 'Conflict', status: 409, detail: 'Items already decided: i1' }),
            { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        },
      })
      renderTask()
      await screen.findAllByText('John Tan')

      await userEvent.click(screen.getAllByRole('button', { name: 'Confirm jtan' })[0])
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))

      expect(await within(await screen.findByRole('dialog')).findByText(/already decided/)).toBeInTheDocument()
    })

    it('saves the full set of groups from Edit Groups, showing the groups it cannot keep', async () => {
      const calls = stubApi({ items: [item({ groups: ['Users', 'Auditors'] })] })
      renderTask()
      await screen.findAllByText('John Tan')

      await userEvent.click(screen.getAllByRole('button', { name: 'Edit groups of jtan' })[0])
      const dialog = await screen.findByRole('dialog')
      // Auditors is held but not assignable: shown locked, with the warning that saving drops it.
      expect(await within(dialog).findByRole('list', { name: 'Groups you cannot assign' })).toHaveTextContent(
        'Auditors',
      )
      expect(within(dialog).getByText(/saving replaces all/)).toBeInTheDocument()
      // Nothing changed yet, so there is nothing to save.
      expect(within(dialog).getByRole('button', { name: 'Save and confirm' })).toBeDisabled()

      await userEvent.click(within(dialog).getByRole('button', { name: 'toggle menu' }))
      await userEvent.click(await screen.findByRole('option', { name: 'Viewers' }))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save and confirm' }))

      await waitFor(() =>
        expect(calls).toContainEqual({
          key: 'PUT /api/account-reviews/tasks/t1/items/i1/groups',
          body: { groupIds: ['g1', 'g2'] },
        }),
      )
    })

    it('confirms the ticked accounts in one decision after a confirmation', async () => {
      const calls = stubApi({ items: [item(), item({ id: 'i2', userId: 'u2', username: 'mlim', name: 'Mary Lim' })] })
      renderTask()
      await screen.findAllByText('John Tan')
      expect(screen.getByRole('button', { name: 'Confirm selected as reviewed (0)' })).toBeDisabled()

      const table = within(screen.getByRole('table'))
      await userEvent.click(table.getAllByRole('checkbox')[1])
      await userEvent.click(table.getAllByRole('checkbox')[2])
      await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed (2)' }))
      expect(calls.some(({ key }) => key.startsWith('POST'))).toBe(false)
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))

      await waitFor(() =>
        expect(calls).toContainEqual({
          key: 'POST /api/account-reviews/tasks/t1/decisions',
          body: { itemIds: ['i1', 'i2'], decision: 'confirm' },
        }),
      )
    })

    it('does not let a decided or own account be ticked', async () => {
      stubApi({
        items: [
          item({ outcome: 'confirmed' }),
          item({ id: 'i2', username: 'rachel', name: 'Rachel Lim', ownAccount: true }),
        ],
      })
      renderTask()
      await screen.findAllByText('John Tan')

      const [, ...rows] = within(screen.getByRole('table')).getAllByRole('checkbox')
      for (const box of rows) expect(box).toBeDisabled()
    })

    it('forgets the ticked rows when the search changes, since they may no longer be in view', async () => {
      stubApi()
      renderTask()
      await screen.findAllByText('John Tan')
      await userEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[1])
      expect(screen.getByRole('button', { name: 'Confirm selected as reviewed (1)' })).toBeEnabled()

      await userEvent.type(screen.getByRole('searchbox', { name: 'Search accounts' }), 'kumar')

      expect(await screen.findByRole('button', { name: 'Confirm selected as reviewed (0)' })).toBeDisabled()
    })

    it('does not show a refused decision again when the dialog is closed and opened', async () => {
      stubApi({
        writes: {
          'POST /api/account-reviews/tasks/t1/decisions': new Response(
            JSON.stringify({ title: 'Conflict', status: 409, detail: 'Items already decided: i1' }),
            { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
          ),
        },
      })
      renderTask()
      await screen.findAllByText('John Tan')
      await userEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[1])
      await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed (1)' }))
      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))
      await screen.findByText(/already decided/)

      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed (1)' }))

      await screen.findByRole('dialog')
      expect(screen.queryByText(/already decided/)).not.toBeInTheDocument()
    })
  })

  describe('suspended and removed accounts', () => {
    it('confirms a list once, with an optional note', async () => {
      const calls = stubApi()
      renderTask()
      await userEvent.click(await screen.findByRole('tab', { name: /Suspended accounts/ }))
      expect((await screen.findAllByText('Old Account')).length).toBeGreaterThan(0)

      await userEvent.click(screen.getByRole('button', { name: 'Confirm suspended accounts as reviewed' }))
      const dialog = await screen.findByRole('dialog')
      await userEvent.type(within(dialog).getByLabelText(/Note/), 'checked')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))

      await waitFor(() =>
        expect(calls).toContainEqual({
          key: 'POST /api/account-reviews/tasks/t1/populations/suspended/confirmation',
          body: { note: 'checked' },
        }),
      )
    })

    it('shows who confirmed a list and offers no second confirmation', async () => {
      stubApi({
        task: task({
          populations: {
            suspended: {
              confirmed: true,
              confirmedBy: 'rev1',
              confirmedAt: '2026-10-02T09:00:00Z',
              count: 1,
              note: 'ok',
            },
            removed: { confirmed: false },
          },
        }),
      })
      renderTask()
      await userEvent.click(await screen.findByRole('tab', { name: /Suspended accounts/ }))

      expect(await screen.findByText(/Confirmed by rev1/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Confirm suspended accounts/ })).toBeNull()
    })
  })

  describe('reports', () => {
    it('labels the downloads as drafts while the task is open', async () => {
      stubApi()
      renderTask()

      const nav = await screen.findByRole('navigation', { name: 'Report downloads' })
      const pdf = within(nav).getByRole('link', { name: 'PDF (draft)' })
      expect(pdf).toHaveAttribute('href', '/api/account-reviews/tasks/t1/report?format=pdf')
      expect(within(nav).getByRole('link', { name: 'Excel (draft)' })).toBeInTheDocument()
      expect(within(nav).getByRole('link', { name: 'CSV (draft)' })).toBeInTheDocument()
    })

    it('is read-only once completed, with downloads that are not drafts', async () => {
      stubApi({
        task: task({
          status: 'completed',
          completedAt: '2026-10-20T10:00:00Z',
          completedBy: 'rev1',
          reportAvailable: true,
          progress: { reviewed: 1, total: 1 },
        }),
        items: [item({ outcome: 'confirmed' })],
      })
      renderTask()

      expect(await screen.findByText(/This review is read-only/)).toBeInTheDocument()
      expect((await screen.findAllByText('John Tan')).length).toBeGreaterThan(0)
      expect(screen.getByRole('link', { name: 'PDF' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Confirm selected/ })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Confirm jtan' })).toBeNull()
    })
  })
})
