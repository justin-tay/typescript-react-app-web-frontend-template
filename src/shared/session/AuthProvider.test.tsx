import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './auth-context'
import { hasSessionExpired } from './session-end'

const ada = () => new Response(JSON.stringify({ id: '1', username: 'ada', name: 'Ada', roles: [] }), { status: 200 })

function Probe() {
  const { state, expireSession, signOut } = useAuth()
  return (
    <>
      <output data-testid="status">
        {state.status === 'anonymous' ? `anonymous expired=${state.expired}` : state.status}
      </output>
      <button onClick={() => void expireSession()}>expire</button>
      <button onClick={() => void signOut()}>sign out</button>
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

describe('ordering of the server logout and ending the session', () => {
  const hearOtherTab = () => {
    const otherTab = new BroadcastChannel('app:session')
    const heard = vi.fn()
    otherTab.addEventListener('message', (e: MessageEvent) => heard(e.data))
    return { otherTab, heard }
  }

  it('tells other tabs about an expiry even when the server logout fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('location', { assign: vi.fn(), origin: 'http://localhost' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ada()).mockResolvedValueOnce(new Response(null, { status: 500 })))
    const { otherTab, heard } = hearOtherTab()
    renderProbe()
    await screen.findByText('authenticated')

    await userEvent.click(screen.getByRole('button', { name: 'expire' }))

    await waitFor(() => expect(heard).toHaveBeenCalledWith('expired'))
    otherTab.close()
  })

  it('tells other tabs about a sign-out only once the server logout has succeeded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const assign = vi.fn()
    vi.stubGlobal('location', { assign, origin: 'http://localhost' })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(ada())
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ logoutUrl: 'http://kc/logout' }), { status: 200 })),
    )
    sessionStorage.setItem('table-state:users', '{}')
    const { otherTab, heard } = hearOtherTab()
    renderProbe()
    await screen.findByText('authenticated')

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }))
    await screen.findByText('error')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(heard).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('table-state:users')).not.toBeNull()

    // The error state replaced the probe's buttons' parent state, but the provider still works.
    await userEvent.click(screen.getByRole('button', { name: 'sign out' }))
    await waitFor(() => expect(heard).toHaveBeenCalledWith('signed-out'))
    expect(assign).toHaveBeenCalledWith('http://kc/logout')
    otherTab.close()
  })
})
