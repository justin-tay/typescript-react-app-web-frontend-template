import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const respond = (status: number) =>
  vi.fn().mockResolvedValue(new Response(null, { status }))

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('shows a spinner while loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<App />)
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('offers login on 401', async () => {
    vi.stubGlobal('fetch', respond(401))
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows the user and logs out with the CSRF header, then follows the logout URL', async () => {
    document.cookie = 'XSRF-TOKEN=abc'
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sub: '1', name: 'Ada' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ logoutUrl: 'http://kc/logout' }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(await screen.findByText('Hello, Ada')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('http://kc/logout'))
    expect(fetchMock).toHaveBeenLastCalledWith('/logout', {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-XSRF-TOKEN': 'abc' },
    })
  })

  it('shows an error on server failure', async () => {
    vi.stubGlobal('fetch', respond(500))
    render(<App />)
    expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument()
  })
})
