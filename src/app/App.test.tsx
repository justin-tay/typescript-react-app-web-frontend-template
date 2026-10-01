import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_NAME } from '@/config'
import { formatDateTime } from '@/shared/lib/format'
import { LOGIN_PATH } from '@/shared/session/api'
import App from './App'

const respond = (status: number) => vi.fn().mockResolvedValue(new Response(null, { status }))

/** Shows the router's current path, to check the address does not change when the sign-in card appears. */
function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CurrentPath />
      <App />
    </MemoryRouter>,
  )

const ADMIN_ROLES = ['ROLE_USER_MANAGE', 'ROLE_GROUP_MANAGE', 'ROLE_ROLE_MANAGE']

const ada = (roles: string[] = ADMIN_ROLES) =>
  new Response(
    JSON.stringify({
      id: '1',
      username: 'ada',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      roles,
    }),
    { status: 200 },
  )

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('App', () => {
  it('shows a spinner while loading', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    renderAt('/')
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0)
  })

  it('offers sign-in when nobody is signed in', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/')
    expect(await screen.findByRole('button', { name: 'Sign in with SSO' })).toBeInTheDocument()
  })

  it('shows the sign-in card where the visitor is, without changing the address', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/account/personal-info')

    expect(await screen.findByText(/Sign in to continue/)).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/account/personal-info')
  })

  it('does the same for an administration page', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/admin/users')

    expect(await screen.findByText(/Sign in to continue/)).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/users')
  })

  it('confirms logout when Keycloak returns to the logout address', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/login?logout')

    expect(await screen.findByText('You have been signed out.')).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/')
  })

  it('does not claim a logout for a visitor who was never signed in', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/')

    await screen.findByRole('button', { name: 'Sign in with SSO' })
    expect(screen.queryByText('You have been signed out.')).not.toBeInTheDocument()
  })

  it('says single sign-on is unavailable, keeps the passkey option, and clears the address', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/?error=identity_provider_unavailable')

    expect(await screen.findByText(/Single sign-on is temporarily unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in with SSO' })).toBeEnabled()
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/))
  })

  it('does not mention an outage unless the backend reported one', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/?error=something_else')

    await screen.findByRole('button', { name: 'Sign in with SSO' })
    expect(screen.queryByText(/temporarily unavailable/)).not.toBeInTheDocument()
  })

  it('remembers the page asked for before leaving for the identity provider', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    vi.stubGlobal('fetch', respond(401))
    renderAt('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in with SSO' }))

    expect(sessionStorage.getItem('auth.returnPath')).toBe('/admin/users')
    expect(assign).toHaveBeenCalledWith(LOGIN_PATH)
  })

  it('sends a returning visitor on to the page they asked for, once signed in', async () => {
    sessionStorage.setItem('auth.returnPath', '/admin/users')
    const emptyUsersPage = { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (input: RequestInfo) =>
          String(input).startsWith('/api/admin/users')
            ? new Response(JSON.stringify(emptyUsersPage), { status: 200 })
            : ada(),
        ),
    )
    renderAt('/')

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/users')
    expect(sessionStorage.getItem('auth.returnPath')).toBeNull()
  })

  it('greets a signed-in person by name and links to their account pages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada([])),
    )
    renderAt('/')

    expect(
      await screen.findByRole('heading', { name: /^Good (morning|afternoon|evening), Ada Lovelace$/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Personal info/ })).toHaveAttribute('href', '/account/personal-info')
    expect(screen.getByRole('link', { name: /Sign-in methods/ })).toHaveAttribute('href', '/account/signing-in')
    expect(screen.queryByText('Administration')).not.toBeInTheDocument()
  })

  it('has no hero page: the address "/" is the signed-in home', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada([])),
    )
    renderAt('/')

    await screen.findByRole('heading', { name: /Ada Lovelace/ })
    expect(screen.queryByText(/starting point for building/)).not.toBeInTheDocument()
  })

  it('says a page does not exist for an unknown address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada([])),
    )
    renderAt('/nowhere')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the sign-in card in place when another tab ends the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada([])),
    )
    renderAt('/account/personal-info')
    await screen.findByRole('heading', { name: 'Ada Lovelace' })

    const otherTab = new BroadcastChannel('app:session')
    otherTab.postMessage('signed-out')

    expect(await screen.findByText('You have been signed out.')).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/account/personal-info')
    otherTab.close()
  })

  it('offers administration only to people who hold an administration role', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada([])),
    )
    renderAt('/admin')

    expect(await screen.findByText('You do not have access to administration.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my dashboard' })).toHaveAttribute('href', '/')
  })

  it('shows only the sidebar sections a person holds the role for', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (input: RequestInfo) =>
          String(input).startsWith('/api/admin/') ? new Response(null, { status: 403 }) : ada(['ROLE_GROUP_MANAGE']),
        ),
    )
    renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument()
    const nav = within(screen.getAllByRole('navigation')[1])
    expect(nav.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(nav.getByRole('link', { name: 'Groups' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Total users/ })).not.toBeInTheDocument()
  })

  it('offers the account pages and Sign out in the account menu, and no way into administration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada()),
    )
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Account menu for Ada Lovelace' }))

    const menu = within(await screen.findByRole('menu'))
    expect(menu.getByRole('menuitem', { name: 'Personal info' })).toBeInTheDocument()
    expect(menu.getByRole('menuitem', { name: 'Sign-in methods' })).toBeInTheDocument()
    expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
    expect(menu.queryByRole('menuitem', { name: 'Administration' })).not.toBeInTheDocument()

    await userEvent.click(menu.getByRole('menuitem', { name: 'Personal info' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/account/personal-info')
  })

  it('offers the account pages inside administration too, and stays in the admin shell', async () => {
    const emptyPage = { items: [], page: 0, size: 1, totalItems: 0, totalPages: 0 }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (input: RequestInfo) =>
          String(input).startsWith('/api/admin/') ? new Response(JSON.stringify(emptyPage), { status: 200 }) : ada(),
        ),
    )
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: 'Account menu for Ada Lovelace' }))

    const menu = within(await screen.findByRole('menu'))
    expect(menu.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()

    await userEvent.click(menu.getByRole('menuitem', { name: 'Personal info' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/account/personal-info')
    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByText('Personal info')).toBeInTheDocument()
  })

  it('shows a paged, sortable list of users on the admin users page', async () => {
    const usersPage = {
      items: [
        {
          id: '1',
          username: 'ada',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          enabled: true,
          status: 'active',
          lastLoginAt: '2025-09-21T01:12:00Z',
          groups: [{ id: 'g1', name: 'Admins' }],
        },
        {
          id: '2',
          username: 'grace',
          name: 'Grace Hopper',
          email: 'grace@example.com',
          enabled: true,
          status: 'pending',
          groups: [],
        },
        {
          id: '3',
          username: 'alan',
          name: 'Alan Turing',
          email: 'alan@example.com',
          enabled: false,
          status: 'disabled',
          groups: [],
        },
      ],
      page: 0,
      size: 20,
      totalItems: 3,
      totalPages: 1,
    }
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/admin/users')) {
        return new Response(JSON.stringify(usersPage), { status: 200 })
      }
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/admin/users')
    expect(await screen.findByRole('cell', { name: 'ada' })).toBeInTheDocument()
    const table = within(screen.getByRole('table'))
    expect(table.getByText('Active')).toBeInTheDocument()
    expect(table.getByText('Pending')).toBeInTheDocument()
    expect(table.getByText('Disabled')).toBeInTheDocument()
    expect(table.getByText('Admins')).toBeInTheDocument()
    // Local time, so the expected text is built the same way instead of hard-coding a timezone.
    expect(table.getByText(formatDateTime('2025-09-21T01:12:00Z'))).toBeInTheDocument()
    expect(table.getAllByText('Never')).toHaveLength(2)
  })

  it('shows a warning when the signed-in user lacks USER_MANAGE', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/admin/users')) return new Response(null, { status: 403 })
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/admin/users')
    expect(await screen.findByText(/do not have permission/)).toBeInTheDocument()
  })

  it('shows name and email as read-only when editing an existing user', async () => {
    const usersPage = {
      items: [
        {
          id: '1',
          username: 'ada',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          enabled: true,
          status: 'active',
          groups: [],
        },
      ],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    }
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/admin/users')) return new Response(JSON.stringify(usersPage), { status: 200 })
      if (String(input).startsWith('/api/admin/groups')) {
        return new Response(JSON.stringify({ items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 }), {
          status: 200,
        })
      }
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/admin/users')
    // The table and, below the md breakpoint, the card list both render in jsdom, which ignores CSS.
    await userEvent.click((await screen.findAllByRole('button', { name: 'Edit' }))[0])
    expect(await screen.findByLabelText('Name')).toBeDisabled()
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })

  it('shows the personal info page when passkeys are not enabled on the backend', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/account/passkeys')) return new Response(null, { status: 404 })
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/account/signing-in')
    expect(await screen.findByText('Passkeys are not enabled for this application.')).toBeInTheDocument()
  })

  it('shows the privacy and terms links in the footer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada([])),
    )
    renderAt('/')
    const footer = within(await screen.findByRole('navigation', { name: 'Footer' }))
    expect(footer.getByRole('link', { name: 'Privacy Statement' })).toBeInTheDocument()
    expect(footer.getByRole('link', { name: 'Terms of Use' })).toBeInTheDocument()
    const report = footer.getByRole('link', { name: /Report Vulnerability/ })
    expect(report).toHaveAttribute('target', '_blank')
    expect(report).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(report).getByText('(opens in a new tab)')).toBeInTheDocument()
  })

  it('shows the personal info of a logged-in user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ada()),
    )
    renderAt('/account/personal-info')
    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
  })

  it('logs out from the user menu with the CSRF header and follows the logout URL', async () => {
    document.cookie = 'XSRF-TOKEN=abc'
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ada())
      .mockResolvedValueOnce(new Response(JSON.stringify({ logoutUrl: 'http://kc/logout' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/account/personal-info')
    await userEvent.click(await screen.findByRole('button', { name: /Account menu/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('http://kc/logout'))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/logout', {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-XSRF-TOKEN': 'abc' },
    })
  })

  it('shows a friendly error on server failure, without the HTTP status', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', respond(500))
    renderAt('/')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText(/HTTP 500/)).not.toBeInTheDocument()
  })
})

describe('App admin users toolbar', () => {
  const usersPage = (items: object[] = []) => ({
    items,
    page: 0,
    size: 20,
    totalItems: items.length,
    totalPages: items.length > 0 ? 1 : 0,
  })

  function stubUsersApi() {
    const userRequests: URL[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo) => {
        const url = new URL(String(input), 'http://localhost')
        if (url.pathname === '/api/admin/users') {
          userRequests.push(url)
          return new Response(JSON.stringify(usersPage()), { status: 200 })
        }
        if (url.pathname === '/api/admin/groups') {
          return new Response(JSON.stringify({ ...usersPage(), items: [{ id: 'g1', name: 'Admins', roles: [] }] }), {
            status: 200,
          })
        }
        return ada()
      }),
    )
    return userRequests
  }

  it('sends the typed search to the backend', async () => {
    const userRequests = stubUsersApi()
    renderAt('/admin/users')
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search users' }), 'ada')

    await waitFor(() => expect(userRequests.at(-1)?.searchParams.get('search')).toBe('ada'))
  })

  it('sends the chosen status as a filter', async () => {
    const userRequests = stubUsersApi()
    renderAt('/admin/users')
    await userEvent.click(await screen.findByRole('button', { name: /Status/ }))
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Pending' }))

    await waitFor(() => expect(userRequests.at(-1)?.searchParams.get('status')).toBe('pending'))
  })

  it('restores the search and filters after a hard refresh', async () => {
    const userRequests = stubUsersApi()
    const first = renderAt('/admin/users')
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search users' }), 'ada')
    await waitFor(() => expect(userRequests.at(-1)?.searchParams.get('search')).toBe('ada'))
    first.unmount()

    renderAt('/admin/users')

    expect(await screen.findByRole('searchbox', { name: 'Search users' })).toHaveValue('ada')
    await waitFor(() => expect(userRequests.at(-1)?.searchParams.get('search')).toBe('ada'))
  })
})

describe('App admin screens', () => {
  const page = (items: object[], totalItems = items.length) => ({
    items,
    page: 0,
    size: 20,
    totalItems,
    totalPages: items.length > 0 ? 1 : 0,
  })
  const pendingUser = {
    id: 'u1',
    username: 'grace',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    enabled: true,
    status: 'pending',
    groups: [{ id: 'g1', name: 'Admins' }],
  }
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

  function stubAdminApi() {
    const requests: URL[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo) => {
        const url = new URL(String(input), 'http://localhost')
        requests.push(url)
        if (url.pathname === '/api/admin/users/u1') return json(pendingUser)
        if (url.pathname === '/api/admin/users') {
          const status = url.searchParams.get('status')
          if (url.searchParams.get('size') === '1')
            return json(page([], status === 'pending' ? 2 : status === 'active' ? 3 : 5))
          return json(page([pendingUser]))
        }
        if (url.pathname === '/api/admin/groups/g1')
          return json({ id: 'g1', name: 'Admins', roles: [{ id: 'r1', name: 'USER_MANAGE' }] })
        if (url.pathname === '/api/admin/groups') return json(page([], 4))
        return ada()
      }),
    )
    return requests
  }

  it('shows the headline figures on the dashboard', async () => {
    stubAdminApi()
    renderAt('/admin')

    expect(await screen.findByRole('heading', { name: 'Welcome, Ada Lovelace' })).toBeInTheDocument()
    const card = async (label: string) => (await screen.findByRole('button', { name: new RegExp(label) })).textContent
    await waitFor(async () => expect(await card('Total users')).toContain('5'))
    expect(await card('Active users')).toContain('3')
    expect(await card('Pending users')).toContain('2')
    expect(await card('Groups')).toContain('4')
  })

  it('opens the users list already filtered when a dashboard card is pressed', async () => {
    const requests = stubAdminApi()
    renderAt('/admin')
    await userEvent.click(await screen.findByRole('button', { name: /Pending users/ }))

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    await waitFor(() =>
      expect(
        requests.some(
          (url) =>
            url.pathname === '/api/admin/users' &&
            url.searchParams.get('size') === '20' &&
            url.searchParams.get('status') === 'pending',
        ),
      ).toBe(true),
    )
  })

  it('shows one user with their details and groups, and a way back to the list', async () => {
    stubAdminApi()
    renderAt('/admin/users/u1')

    expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to users/ })).toHaveAttribute('href', '/admin/users')
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(await screen.findByText('grace@example.com')).toBeInTheDocument()
    expect(screen.getByText('Never')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Groups' }))
    expect(await screen.findByRole('link', { name: 'Admins' })).toHaveAttribute('href', '/admin/groups/g1')
  })

  it('says a user does not exist when the backend answers 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (input: RequestInfo) =>
          String(input).startsWith('/api/admin/users/') ? new Response(null, { status: 404 }) : ada(),
        ),
    )
    renderAt('/admin/users/missing')

    expect(await screen.findByText('This user does not exist.')).toBeInTheDocument()
  })

  it('shows a group with its members and roles', async () => {
    const requests = stubAdminApi()
    renderAt('/admin/groups/g1')

    expect(await screen.findByRole('heading', { name: 'Admins' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'grace' })).toHaveAttribute('href', '/admin/users/u1')
    await waitFor(() =>
      expect(
        requests.some((url) => url.pathname === '/api/admin/users' && url.searchParams.get('groupId') === 'g1'),
      ).toBe(true),
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Roles' }))
    expect(await screen.findByText('USER_MANAGE')).toBeInTheDocument()
  })
})

describe('App when the backend cannot be reached', () => {
  const silenceConsole = () => vi.spyOn(console, 'error').mockImplementation(() => {})

  it('says the service is unavailable on the sign-in card, without the HTTP status', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(502))
    renderAt('/')

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: APP_NAME })).toBeInTheDocument()
    expect(screen.queryByText(/HTTP 502/)).not.toBeInTheDocument()
  })

  it('shows no login options on the login page when the network request fails outright', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderAt('/')

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/Sign in to continue/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in with SSO' })).not.toBeInTheDocument()
  })

  it('says something went wrong, not unavailable, for another server error', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(500))
    renderAt('/')

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText(/temporarily unavailable/)).not.toBeInTheDocument()
  })

  it('shows the notice on a protected page too', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(503))
    renderAt('/account/personal-info')

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument()
  })

  it('recovers when the backend comes back and the visitor tries again', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(502))
    renderAt('/')
    await screen.findByText(/temporarily unavailable/)

    vi.stubGlobal('fetch', respond(401))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: 'Sign in with SSO' })).toBeInTheDocument()
  })
})
