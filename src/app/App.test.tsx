import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const respond = (status: number) =>
  vi.fn().mockResolvedValue(new Response(null, { status }))

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )

const ada = () =>
  new Response(
    JSON.stringify({
      id: '1',
      username: 'ada',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      roles: [],
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
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderAt('/')
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0)
  })

  it('offers login on the login page', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/login')
    expect(await screen.findByRole('button', { name: 'Log in with SSO' })).toBeInTheDocument()
  })

  it('sends a logged-out visitor from the account page to the login page', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/account')
    expect(await screen.findByText('Log in to continue')).toBeInTheDocument()
  })

  it('confirms logout at the logout return path', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/login?logout')
    expect(await screen.findByText('You have been logged out.')).toBeInTheDocument()
  })

  it('sends a logged-in user from the login page to their account', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ada()))
    renderAt('/login')
    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument()
  })

  it('links the landing page to the login page', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/')
    await userEvent.click((await screen.findAllByRole('button', { name: 'Log in' }))[0])
    expect(await screen.findByText('Log in to continue')).toBeInTheDocument()
  })

  it('sends a logged-out visitor from an admin page to the login page', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/users')
    expect(await screen.findByText('Log in to continue')).toBeInTheDocument()
  })

  it('returns to the admin page a login round trip was started from', async () => {
    vi.stubGlobal('fetch', respond(401))
    const { unmount } = renderAt('/users')
    await screen.findByText('Log in to continue')
    expect(sessionStorage.getItem('auth.returnPath')).toBe('/users')

    // The actual round trip is a full navigation through Keycloak; simulate only its
    // effect, landing back on "/" now authenticated, since that always happens on "/".
    unmount()
    const emptyUsersPage = { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: RequestInfo) =>
        String(input).startsWith('/api/admin/users')
          ? new Response(JSON.stringify(emptyUsersPage), { status: 200 })
          : ada(),
      ),
    )
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(sessionStorage.getItem('auth.returnPath')).toBeNull()
  })

  it('shows a paged, sortable list of users on the admin users page', async () => {
    const usersPage = {
      items: [
        { id: '1', username: 'ada', displayName: 'Ada Lovelace', email: 'ada@example.com', enabled: true, groups: [{ id: 'g1', name: 'Admins' }] },
      ],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    }
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/admin/users')) {
        return new Response(JSON.stringify(usersPage), { status: 200 })
      }
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/users')
    expect(await screen.findByRole('cell', { name: 'ada' })).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Admins')).toBeInTheDocument()
  })

  it('shows a warning when the signed-in user lacks USER_MANAGE', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/admin/users')) return new Response(null, { status: 403 })
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/users')
    expect(await screen.findByText(/do not have permission/)).toBeInTheDocument()
  })

  it('shows display name and email as read-only when editing an existing user', async () => {
    const usersPage = {
      items: [
        { id: '1', username: 'ada', displayName: 'Ada Lovelace', email: 'ada@example.com', enabled: true, groups: [] },
      ],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    }
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/admin/users')) return new Response(JSON.stringify(usersPage), { status: 200 })
      if (String(input).startsWith('/api/admin/groups')) {
        return new Response(JSON.stringify({ items: [], page: 0, size: 100, totalItems: 0, totalPages: 0 }), { status: 200 })
      }
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/users')
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    expect(await screen.findByLabelText('Display name')).toBeDisabled()
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })

  it('shows the personal info page when passkeys are not enabled on the backend', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo) => {
      if (String(input).startsWith('/api/account/passkeys')) return new Response(null, { status: 404 })
      return ada()
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/account/security')
    expect(await screen.findByText('Passkeys are not enabled for this application.')).toBeInTheDocument()
  })

  it('shows the mandatory privacy and terms links in the footer', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/')
    const footer = within(await screen.findByRole('navigation', { name: 'Footer' }))
    expect(footer.getByRole('link', { name: 'Privacy Statement' })).toBeInTheDocument()
    expect(footer.getByRole('link', { name: 'Terms of Use' })).toBeInTheDocument()
  })

  it('shows the personal info of a logged-in user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ada()))
    renderAt('/account')
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
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ logoutUrl: 'http://kc/logout' }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/account')
    await userEvent.click(await screen.findByRole('button', { name: /Account menu/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }))
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

describe('App when the backend cannot be reached', () => {
  const silenceConsole = () => vi.spyOn(console, 'error').mockImplementation(() => {})

  it('keeps the landing page and says the service is unavailable, without the HTTP status', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(502))
    renderAt('/')

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Web app template' })).toBeInTheDocument()
    expect(screen.queryByText(/HTTP 502/)).not.toBeInTheDocument()
  })

  it('shows no login options on the login page when the network request fails outright', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderAt('/login')

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument()
    expect(screen.queryByText('Log in to continue')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log in with SSO' })).not.toBeInTheDocument()
  })

  it('says something went wrong, not unavailable, for another server error', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(500))
    renderAt('/login')

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText(/temporarily unavailable/)).not.toBeInTheDocument()
  })

  it('shows the notice on a protected page too', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(503))
    renderAt('/account')

    expect(await screen.findByText(/temporarily unavailable/)).toBeInTheDocument()
  })

  it('recovers when the backend comes back and the visitor tries again', async () => {
    silenceConsole()
    vi.stubGlobal('fetch', respond(502))
    renderAt('/login')
    await screen.findByText(/temporarily unavailable/)

    vi.stubGlobal('fetch', respond(401))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('button', { name: 'Log in with SSO' })).toBeInTheDocument()
  })
})
