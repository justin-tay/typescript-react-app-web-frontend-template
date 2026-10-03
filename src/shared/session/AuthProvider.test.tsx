import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './auth-context'
import { hasSessionExpired } from './session-expired'

const ada = () => new Response(JSON.stringify({ id: '1', username: 'ada', name: 'Ada', roles: [] }), { status: 200 })

function Probe() {
  const { state, expireSession } = useAuth()
  return (
    <>
      <output data-testid="status">
        {state.status === 'anonymous' ? `anonymous expired=${state.expired}` : state.status}
      </output>
      <button onClick={() => void expireSession()}>expire</button>
    </>
  )
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('expireSession', () => {
  it('signs out, follows the Keycloak logout address, and remembers the session as expired', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign, origin: 'http://localhost' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ada())
      .mockResolvedValueOnce(new Response(JSON.stringify({ logoutUrl: 'http://kc/logout' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderProbe()
    await screen.findByText('authenticated')

    await userEvent.click(screen.getByRole('button', { name: 'expire' }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith('http://kc/logout'))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/logout', expect.objectContaining({ method: 'POST' }))
    expect(hasSessionExpired()).toBe(true)
  })

  it('shows the expired sign-in card in place when the sign-out call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const assign = vi.fn()
    vi.stubGlobal('location', { assign, origin: 'http://localhost' })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(ada())
        .mockResolvedValueOnce(new Response(null, { status: 401 })),
    )
    renderProbe()
    await screen.findByText('authenticated')

    await userEvent.click(screen.getByRole('button', { name: 'expire' }))

    expect(await screen.findByText('anonymous expired=true')).toBeInTheDocument()
    expect(assign).not.toHaveBeenCalled()
  })
})
