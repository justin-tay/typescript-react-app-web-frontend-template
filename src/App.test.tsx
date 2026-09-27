import { render, screen, waitFor } from '@testing-library/react'
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
  new Response(JSON.stringify({ sub: '1', name: 'Ada Lovelace', email: 'ada@example.com' }), {
    status: 200,
  })

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('shows a spinner while loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    renderAt('/')
    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0)
  })

  it('offers login on 401', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/')
    expect((await screen.findAllByRole('button', { name: 'Log in' })).length).toBe(2)
  })

  it('redirects a logged-out visitor from the profile page to the landing page', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/profile')
    expect(await screen.findByRole('heading', { name: 'Web app template' })).toBeInTheDocument()
  })

  it('shows the landing page at the logout return path', async () => {
    vi.stubGlobal('fetch', respond(401))
    renderAt('/login?logout')
    expect(await screen.findByRole('heading', { name: 'Web app template' })).toBeInTheDocument()
  })

  it('shows the profile of a logged-in user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ada()))
    renderAt('/profile')
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
    renderAt('/profile')
    await userEvent.click(await screen.findByRole('button', { name: /Account menu/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('http://kc/logout'))
    expect(fetchMock).toHaveBeenLastCalledWith('/logout', {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-XSRF-TOKEN': 'abc' },
    })
  })

  it('shows an error on server failure', async () => {
    vi.stubGlobal('fetch', respond(500))
    renderAt('/')
    expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument()
  })
})
