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
  counts: { pending: 2, confirmed: 1, confirmedGroupsEdited: 0, removed: 0 },
  progress: { reviewed: 1, total: 3 },
  populations: { suspended: { confirmed: false }, removed: { confirmed: false } },
  reportAvailable: false,
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
  it('lists the tasks with their status and progress, each opening its task', async () => {
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

describe('administration navigation', () => {
  const ALL_ROLES = ['ROLE_USER_MANAGE', 'ROLE_GROUP_MANAGE', 'ROLE_ACCOUNT_REVIEWER', 'ROLE_SETTINGS_MANAGE']
  const sidebar = async () => within(await screen.findByRole('navigation', { name: 'Administration' }))

  it('lists the overview first, then a plain list of sections with no heading above them', async () => {
    stubApi({}, ALL_ROLES)
    renderAt('/admin')

    const nav = await sidebar()
    expect(nav.getAllByRole('link').map((link) => link.textContent?.replace(/\d+ open/, '').trim())).toEqual([
      'Overview',
      'Users',
      'Groups',
      'Account reviews',
      'Audit trail',
      'Settings',
    ])
    expect(nav.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('shows no breadcrumb on the overview, which would only point at the page you are on', async () => {
    stubApi({}, ALL_ROLES)
    renderAt('/admin')
    await sidebar()

    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument()
  })

  it('starts the breadcrumb at the section, Administration, which leads to the overview', async () => {
    stubApi({}, ALL_ROLES)
    renderAt('/admin/users')
    await screen.findByRole('heading', { name: 'Users' })

    expect(screen.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin')
  })

  it('adds the list and then Details on a detail page', async () => {
    stubApi({ 'GET /api/admin/groups/g1': () => json({ id: 'g1', name: 'Auditors', roles: [] }) }, ALL_ROLES)
    renderAt('/admin/groups/g1')
    await screen.findByRole('heading', { name: 'Auditors' })

    const trail = within(screen.getByRole('main'))
    expect(trail.getByRole('link', { name: 'Administration' })).toHaveAttribute('href', '/admin')
    expect(trail.getByRole('link', { name: 'Groups' })).toHaveAttribute('href', '/admin/groups')
    expect(trail.getByText('Details')).toBeInTheDocument()
  })
})

describe('administration overview', () => {
  const attention = () => screen.queryByRole('heading', { name: 'Needs your attention' })

  it('tells a reviewer an open review and when it is due, with a way to it', async () => {
    stubApi({}, REVIEWER)
    renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Needs your attention' })).toBeInTheDocument()
    expect(screen.getByText('1 account review open, due 31 Dec 2026.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to account reviews' })).toHaveAttribute('href', '/admin/reviews')
  })

  it('puts an overdue review first and says so', async () => {
    stubApi({ 'GET /api/tasks/summary': () => json({ openCount: 3, overdueCount: 2 }) }, REVIEWER)
    renderAt('/admin')

    expect(await screen.findByText('2 account reviews overdue.')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.queryByText(/open, due/)).not.toBeInTheDocument()
  })

  it('says nothing needs attention when no review is open', async () => {
    stubApi({ 'GET /api/tasks/summary': () => json({ openCount: 0, overdueCount: 0 }) }, REVIEWER)
    renderAt('/admin')

    expect(await screen.findByText('Nothing needs your attention.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Go to account reviews' })).not.toBeInTheDocument()
  })

  it('is not shown to someone who cannot act on reviews', async () => {
    stubApi({}, ['ROLE_USER_MANAGE'])
    renderAt('/admin')

    await screen.findByRole('heading', { name: 'At a glance' })
    expect(attention()).not.toBeInTheDocument()
  })

  it('shows nothing, not an error, when the figures cannot be loaded', async () => {
    stubApi({ 'GET /api/tasks/summary': () => json({ detail: 'down' }, 503) }, REVIEWER)
    renderAt('/admin')

    await screen.findByRole('heading', { name: /Welcome/ })
    expect(attention()).not.toBeInTheDocument()
  })

  it('describes itself in words that are true for every role, since each sees different parts', async () => {
    stubApi({}, ['ROLE_SETTINGS_MANAGE'])
    renderAt('/admin')

    expect(await screen.findByText('What needs your attention, and where things stand.')).toBeInTheDocument()
  })

  it('leaves out the figures heading when the person has no users or groups to count', async () => {
    stubApi({}, REVIEWER)
    renderAt('/admin')

    await screen.findByRole('heading', { name: 'Needs your attention' })
    expect(screen.queryByRole('heading', { name: 'At a glance' })).not.toBeInTheDocument()
  })
})
