import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AriaRouterProvider } from './AriaRouterProvider'
import App from './App'

const REVIEWER = ['ROLE_ACCOUNT_REVIEWER']

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const page = (items: object[]) => ({
  items,
  page: 0,
  size: 20,
  totalItems: items.length,
  totalPages: items.length ? 1 : 0,
})

const task = (over: object = {}) => ({
  id: 't1',
  type: 'account_review',
  status: 'open',
  startDate: '2026-10-01',
  dueDate: '2026-12-31',
  overdue: false,
  counts: { pending_verification: 2, verified: 1 },
  ...over,
})

const item = (over: object = {}) => ({
  id: 'i1',
  userId: 'u1',
  username: 'olivia.chan',
  name: 'Olivia Chan',
  category: 'active',
  reviewStatus: 'pending_verification',
  ownAccount: false,
  lastLoginAt: '2026-09-01T00:00:00Z',
  ...over,
})

interface Call {
  method: string
  url: URL
  body?: unknown
}

/**
 * A backend that answers by path. `handlers` is checked first, so a test overrides only what it
 * cares about; the signed-in user defaults to a reviewer.
 */
function stubApi(handlers: Record<string, (call: Call) => Response> = {}, roles = REVIEWER) {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (input: RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost')
      const call: Call = {
        method: init?.method ?? 'GET',
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      }
      calls.push(call)
      const handler = handlers[`${call.method} ${url.pathname}`]
      if (handler) return handler(call)
      if (url.pathname === '/api/login-user' || url.pathname === '/login-user') {
        return json({ id: 'me', username: 'rachel', name: 'Rachel Lim', roles })
      }
      if (url.pathname === '/api/tasks/summary')
        return json({ openCount: 1, overdueCount: 0, earliestDueDate: '2026-12-31' })
      if (call.method === 'POST') return new Response(null, { status: 204 })
      return json(page([]))
    }),
  )
  return calls
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AriaRouterProvider>
        <App />
      </AriaRouterProvider>
    </MemoryRouter>,
  )

const rowOf = (name: string) =>
  within(screen.getByRole('table')).getByRole('cell', { name }).closest('tr') as HTMLElement

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('review navigation', () => {
  it('shows a reviewer only what the role allows, with the open count', async () => {
    stubApi()
    renderAt('/admin')

    const nav = within((await screen.findAllByRole('navigation'))[1])
    expect(await nav.findByRole('link', { name: /Account reviews/ })).toBeInTheDocument()
    expect(await nav.findByText('1 open')).toBeInTheDocument()
    expect(nav.getByRole('link', { name: 'Audit trail' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('flags an overdue review in the badge', async () => {
    stubApi({ 'GET /api/tasks/summary': () => json({ openCount: 2, overdueCount: 1 }) })
    renderAt('/admin')
    expect(await screen.findByText('1 overdue')).toBeInTheDocument()
  })

  it('links to administration from the home page for someone with a role', async () => {
    stubApi()
    renderAt('/')
    expect(await screen.findByRole('link', { name: /Administration/ })).toHaveAttribute('href', '/admin')
  })

  it('offers the settings page to a settings administrator only', async () => {
    stubApi({}, ['ROLE_SETTINGS_MANAGE'])
    renderAt('/admin')
    const nav = within((await screen.findAllByRole('navigation'))[1])
    expect(await nav.findByRole('link', { name: 'Settings' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: /Account reviews/ })).not.toBeInTheDocument()
  })
})

describe('review dashboard', () => {
  it('lists the tasks with their status and counts, each opening its task', async () => {
    stubApi({
      'GET /api/tasks': () =>
        json(
          page([
            task({ overdue: true }),
            task({
              id: 't0',
              status: 'completed',
              completedAt: '2026-07-01T00:00:00Z',
              completedBy: 'ravi',
              startDate: '2026-07-01',
              dueDate: '2026-09-30',
            }),
          ]),
        ),
    })
    renderAt('/admin/reviews')

    const table = within(await screen.findByRole('table'))
    expect(await table.findByText('Overdue')).toBeInTheDocument()
    // The badge, and the column of that name.
    expect(table.getAllByText('Completed')).toHaveLength(2)
    expect(table.getByText(/by ravi/)).toBeInTheDocument()
    expect(table.getByRole('link', { name: /1 Oct 2026 to 31 Dec 2026/ })).toHaveAttribute('href', '/admin/reviews/t1')
  })

  it('sends the chosen status as a filter', async () => {
    const calls = stubApi()
    renderAt('/admin/reviews')
    await userEvent.click(await screen.findByRole('button', { name: /Status/ }))
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Open' }))

    await waitFor(() =>
      expect(
        calls
          .filter((c) => c.url.pathname === '/api/tasks')
          .at(-1)
          ?.url.searchParams.get('status'),
      ).toBe('open'),
    )
  })

  it('says so when there are no reviews yet', async () => {
    stubApi()
    renderAt('/admin/reviews')
    expect((await screen.findAllByText(/No reviews yet/)).length).toBeGreaterThan(0)
  })
})

describe('a page that fails to render', () => {
  it('shows a notice, keeps the navigation, and recovers when another page is opened', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // A task with no counts at all makes the dashboard throw while rendering.
    stubApi({ 'GET /api/tasks': () => json(page([{ ...task(), counts: undefined }])) })
    renderAt('/admin/reviews')

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    const nav = within((await screen.findAllByRole('navigation'))[1])
    await userEvent.click(nav.getByRole('link', { name: 'Audit trail' }))

    expect(await screen.findByRole('heading', { name: 'Audit trail' })).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})

describe('review task', () => {
  const taskApi = (taskOver: object = {}, items: object[] = [item()]) =>
    stubApi({
      'GET /api/account-reviews/tasks/t1': () => json(task(taskOver)),
      'GET /api/account-reviews/tasks/t1/items': ({ url }) => {
        const category = url.searchParams.get('category')
        return json(page(category === 'active' ? items : []))
      },
    })

  it('shows the task, and asks the server for the active category first', async () => {
    const calls = taskApi()
    renderAt('/admin/reviews/t1')

    expect(await screen.findByRole('heading', { name: 'Account review' })).toBeInTheDocument()
    expect(screen.getByText('1 Oct 2026 to 31 Dec 2026')).toBeInTheDocument()
    expect(await screen.findByRole('cell', { name: 'olivia.chan' })).toBeInTheDocument()
    expect(calls.find((c) => c.url.pathname.endsWith('/items'))?.url.searchParams.get('category')).toBe('active')
  })

  it('disables every action on your own account and says why', async () => {
    taskApi({}, [item(), item({ id: 'i2', userId: 'me', username: 'rachel', name: 'Rachel Lim', ownAccount: true })])
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'rachel' })

    const own = within(rowOf('rachel'))
    expect(own.getByRole('checkbox')).toBeDisabled()
    expect(own.getByRole('button', { name: 'Suspend' })).toBeDisabled()
    expect(own.getByText('You cannot act on your own account.')).toBeInTheDocument()
    expect(within(rowOf('olivia.chan')).getByRole('button', { name: 'Suspend' })).toBeEnabled()
  })

  it('does not let an already verified account be selected', async () => {
    taskApi({}, [item({ reviewStatus: 'verified' })])
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    expect(within(rowOf('olivia.chan')).getByRole('checkbox')).toBeDisabled()
  })

  it('verifies the selected accounts in one decision after a confirmation', async () => {
    const calls = taskApi({}, [item(), item({ id: 'i2', userId: 'u2', username: 'kumar.raj', name: 'Kumar Raj' })])
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    expect(screen.getByRole('button', { name: 'Verify selected (0)' })).toBeDisabled()

    await userEvent.click(within(rowOf('olivia.chan')).getByRole('checkbox'))
    await userEvent.click(within(rowOf('kumar.raj')).getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Verify selected (2)' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
    await userEvent.click(dialog.getByRole('button', { name: 'Verify' }))

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toMatchObject({
        url: { pathname: '/api/account-reviews/tasks/t1/decisions' },
        body: { itemIds: ['i1', 'i2'], decision: 'verify' },
      }),
    )
  })

  it('removes the selected accounts only with a reason', async () => {
    const calls = taskApi()
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    await userEvent.click(within(rowOf('olivia.chan')).getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Remove selected (1)' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByRole('button', { name: 'Remove' })).toBeDisabled()

    await userEvent.click(dialog.getByRole('button', { name: /Reason/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Policy violation' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        itemIds: ['i1'],
        decision: 'remove',
        reasonCode: 'policy_violation',
      }),
    )
  })

  it('shows the server message when a batch is refused, and keeps the dialog open', async () => {
    stubApi({
      'GET /api/account-reviews/tasks/t1': () => json(task()),
      'GET /api/account-reviews/tasks/t1/items': () => json(page([item()])),
      'POST /api/account-reviews/tasks/t1/decisions': () =>
        json({ type: 'urn:problem:conflict', detail: 'Items already decided: i1' }, 409),
    })
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    await userEvent.click(within(rowOf('olivia.chan')).getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Verify selected (1)' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Verify' }))

    expect(await screen.findByText('Items already decided: i1')).toBeInTheDocument()
  })

  it('suspends an account from its row with a reason', async () => {
    const calls = taskApi()
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    await userEvent.click(within(rowOf('olivia.chan')).getByRole('button', { name: 'Suspend' }))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: /Reason/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Other' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Suspend' }))

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toMatchObject({
        url: { pathname: '/api/account-reviews/tasks/t1/items/i1/suspend' },
        body: { reasonCode: 'other' },
      }),
    )
  })

  it('is read-only once completed, except for suspending and unsuspending', async () => {
    taskApi({ status: 'completed', completedAt: '2026-12-01T00:00:00Z', completedBy: 'ravi' })
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })

    expect(screen.getByText(/Decisions are closed/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Verify selected/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove selected/ })).not.toBeInTheDocument()
    expect(within(screen.getByRole('table')).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(rowOf('olivia.chan')).getByRole('button', { name: 'Suspend' })).toBeEnabled()
  })

  it('gives a removed account no actions', async () => {
    stubApi({
      'GET /api/account-reviews/tasks/t1': () => json(task()),
      'GET /api/account-reviews/tasks/t1/items': ({ url }) =>
        json(
          page(
            url.searchParams.get('category') === 'removed'
              ? [
                  item({
                    id: 'e1',
                    category: 'removed',
                    reviewStatus: null,
                    lastLoginAt: null,
                    decidedBy: null,
                    decidedAt: null,
                    removedAt: '2026-10-05T00:00:00Z',
                    removedBy: 'system',
                    reasonCode: 'inactive_account',
                  }),
                ]
              : [],
          ),
        ),
    })
    renderAt('/admin/reviews/t1')
    await userEvent.click(await screen.findByRole('tab', { name: 'Removed' }))

    const row = within(await waitFor(() => rowOf('olivia.chan')))
    expect(row.queryByRole('button')).not.toBeInTheDocument()
    expect(row.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(row.getByText(/by system/)).toBeInTheDocument()
    // The small-screen card of the same row: a removed row has no review status to show.
    expect(screen.getByText(/Removed .* by system\. Inactive account/)).toBeInTheDocument()
  })

  it('says a review does not exist when the server answers 404', async () => {
    stubApi({ 'GET /api/account-reviews/tasks/t1': () => new Response(null, { status: 404 }) })
    renderAt('/admin/reviews/t1')
    expect(await screen.findByText('This review does not exist.')).toBeInTheDocument()
  })
})

describe('settings', () => {
  const settings = {
    inactivity: { enabled: true, suspendAfterDays: 90, removeAfterDays: 180 },
    review: { enabled: true, intervalMonths: 3 },
  }

  it('saves the whole settings object', async () => {
    const calls = stubApi(
      { 'GET /api/admin/settings': () => json(settings), 'PUT /api/admin/settings': ({ body }) => json(body) },
      ['ROLE_SETTINGS_MANAGE'],
    )
    renderAt('/admin/settings')
    const months = await screen.findByLabelText('Review period (months)')
    await userEvent.clear(months)
    await userEvent.type(months, '6')
    await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
        ...settings,
        review: { enabled: true, intervalMonths: 6 },
      }),
    )
    expect(await screen.findByText('Settings saved.')).toBeInTheDocument()
  })

  it('refuses a removal period that is not after the suspension period', async () => {
    const calls = stubApi({ 'GET /api/admin/settings': () => json(settings) }, ['ROLE_SETTINGS_MANAGE'])
    renderAt('/admin/settings')
    const remove = await screen.findByLabelText('Remove after (days)')
    await userEvent.clear(remove)
    await userEvent.type(remove, '90')

    expect(await screen.findByText(/Removal must come after suspension/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled()
    expect(calls.some((c) => c.method === 'PUT')).toBe(false)
  })

  it('refuses a review period outside 1 to 12 months', async () => {
    stubApi({ 'GET /api/admin/settings': () => json(settings) }, ['ROLE_SETTINGS_MANAGE'])
    renderAt('/admin/settings')
    const months = await screen.findByLabelText('Review period (months)')
    await userEvent.clear(months)
    await userEvent.type(months, '13')
    expect(await screen.findByText(/from 1 to 12/)).toBeInTheDocument()
  })

  it('warns a reviewer who has no settings permission', async () => {
    stubApi({ 'GET /api/admin/settings': () => new Response(null, { status: 403 }) })
    renderAt('/admin/settings')
    expect(await screen.findByText(/do not have permission/)).toBeInTheDocument()
  })
})

describe('audit trail', () => {
  const event = {
    id: 'e1',
    occurredAt: '2026-10-02T03:04:00Z',
    actor: 'rachel',
    action: 'suspend_user',
    targetType: 'USER',
    targetName: 'olivia.chan',
    targetDisplayName: 'Olivia Chan',
    reasonCode: 'other',
    reasonNote: 'checked',
    details: { rolesAdded: ['ACCOUNT_REVIEWER'], before: { status: 'active' } },
  }

  it('lists events and opens the details of one', async () => {
    stubApi({ 'GET /api/audit-events': () => json(page([event])) })
    renderAt('/admin/audit')

    const table = within(await screen.findByRole('table'))
    expect(await table.findByText('Suspend user')).toBeInTheDocument()
    expect(table.getByText('User: Olivia Chan')).toBeInTheDocument()
    expect(table.getByText('Other: checked')).toBeInTheDocument()

    await userEvent.click(table.getByRole('button', { name: 'Details of Suspend user' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText('Roles added')).toBeInTheDocument()
    expect(dialog.getByText('Account reviewer')).toBeInTheDocument()
  })

  it('sends the chosen target type and date range as filters', async () => {
    const calls = stubApi({}, ['ROLE_USER_MANAGE'])
    renderAt('/admin/audit')
    await userEvent.click(await screen.findByRole('button', { name: /Target type/ }))
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Setting' }))
    await userEvent.type(screen.getByLabelText('From'), '2026-10-01')

    await waitFor(() => {
      const last = calls.filter((c) => c.url.pathname === '/api/audit-events').at(-1)?.url.searchParams
      expect(last?.get('targetType')).toBe('SETTING')
      expect(last?.get('occurredFrom')).toBe('2026-10-01')
    })
  })
})

describe('review table selection', () => {
  const twoItems = () =>
    stubApi({
      'GET /api/account-reviews/tasks/t1': () => json(task()),
      'GET /api/account-reviews/tasks/t1/items': () =>
        json(page([item(), item({ id: 'i2', userId: 'u2', username: 'kumar.raj', name: 'Kumar Raj' })])),
    })

  it('forgets the ticked rows when the search changes, since they may no longer be in view', async () => {
    twoItems()
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    await userEvent.click(within(rowOf('olivia.chan')).getByRole('checkbox'))
    expect(screen.getByRole('button', { name: 'Verify selected (1)' })).toBeEnabled()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search accounts' }), 'kumar')

    expect(await screen.findByRole('button', { name: 'Verify selected (0)' })).toBeDisabled()
  })

  it('keeps the ticked rows when only the page changes', async () => {
    twoItems()
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    await userEvent.click(within(rowOf('olivia.chan')).getByRole('checkbox'))

    expect(screen.getByRole('button', { name: 'Verify selected (1)' })).toBeEnabled()
  })

  it('does not show a refused decision again when the dialog is closed and opened', async () => {
    stubApi({
      'GET /api/account-reviews/tasks/t1': () => json(task()),
      'GET /api/account-reviews/tasks/t1/items': () => json(page([item()])),
      'POST /api/account-reviews/tasks/t1/decisions': () =>
        json({ type: 'urn:problem:conflict', detail: 'Items already decided: i1' }, 409),
    })
    renderAt('/admin/reviews/t1')
    await screen.findByRole('cell', { name: 'olivia.chan' })
    await userEvent.click(within(rowOf('olivia.chan')).getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Verify selected (1)' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Verify' }))
    await screen.findByText('Items already decided: i1')

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Verify selected (1)' }))

    await screen.findByRole('dialog')
    expect(screen.queryByText('Items already decided: i1')).not.toBeInTheDocument()
  })
})

describe('adding a passkey', () => {
  it('starts with an empty name each time the dialog is opened', async () => {
    vi.stubGlobal('PublicKeyCredential', class {})
    stubApi({ 'GET /api/account/passkeys': () => json([]) })
    renderAt('/account/signing-in')

    await userEvent.click(await screen.findByRole('button', { name: 'Add a passkey' }))
    await userEvent.type(await screen.findByRole('textbox', { name: /Name this passkey/ }), 'Laptop')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Add a passkey' }))

    expect(await screen.findByRole('textbox', { name: /Name this passkey/ })).toHaveValue('')
  })
})

describe('group controls', () => {
  const groupsBox = () => screen.queryByRole('combobox', { name: 'Group' })

  it('are offered on the users list to someone with the groups role', async () => {
    stubApi({}, ['ROLE_USER_MANAGE', 'ROLE_GROUP_MANAGE'])
    renderAt('/admin/users')

    await screen.findByRole('heading', { name: 'Users' })
    expect(groupsBox()).toBeInTheDocument()
  })

  it('are left out of the users list for someone without it, who could not load them', async () => {
    stubApi({}, ['ROLE_USER_MANAGE'])
    renderAt('/admin/users')

    await screen.findByRole('heading', { name: 'Users' })
    expect(groupsBox()).not.toBeInTheDocument()
  })

  it('leave the group members tab off a group page for someone without the users role', async () => {
    stubApi({ 'GET /api/admin/groups/g1': () => json({ id: 'g1', name: 'Auditors', roles: [] }) }, [
      'ROLE_GROUP_MANAGE',
    ])
    renderAt('/admin/groups/g1')

    await screen.findByRole('heading', { name: 'Auditors' })
    expect(screen.queryByRole('tab', { name: 'Members' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Roles' })).toHaveAttribute('aria-selected', 'true')
  })
})
