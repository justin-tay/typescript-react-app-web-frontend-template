import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReauthenticationRequiredError } from '@/shared/lib/api-errors'
import { registerReauthForm, requestReauthentication, settleReauthRequest } from '@/shared/session/reauth'
import { peekReauthDraft } from '@/shared/session/reauth-stash'
import { ReauthModal } from './ReauthModal'

const signOut = vi.fn()
const loginWithPasskey = vi.fn()
const assign = vi.fn()

vi.mock('@/shared/session/auth-context', () => ({
  useAuth: () => ({ signOut, state: { status: 'authenticated', user: { id: 'u1' } } }),
}))
vi.mock('@/features/login/webauthn-login', () => ({ loginWithPasskey: () => loginWithPasskey() }))

const oidc = new ReauthenticationRequiredError({
  method: 'oidc',
  maxAge: 900,
  reauthenticationUri: '/oauth2/authorization/keycloak?max_age=0',
})
const passkey = new ReauthenticationRequiredError({ method: 'passkey', maxAge: 900 })

describe('ReauthModal', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('location', { ...window.location, assign, pathname: '/admin/users', search: '' })
  })
  afterEach(() => {
    act(() => settleReauthRequest('cancelled'))
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('says why the person is asked to sign in again', async () => {
    render(<ReauthModal />)
    void act(() => void requestReauthentication(oidc))
    expect(await screen.findByText("Confirm it's you")).toBeInTheDocument()
    expect(screen.getByText(/signed in within the last 15 minutes/)).toBeInTheDocument()
  })

  it('rounds the window up to whole minutes', async () => {
    render(<ReauthModal />)
    void act(() => void requestReauthentication(new ReauthenticationRequiredError({ ...oidc, maxAge: 61 })))
    expect(await screen.findByText(/within the last 2 minutes/)).toBeInTheDocument()
  })

  it('saves the open form and goes to sign in again at the URI the backend gave', async () => {
    const unregister = registerReauthForm('user-edit', () => ({ name: 'Ada' }))
    render(<ReauthModal />)
    void act(() => void requestReauthentication(oidc))
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in again' }))
    expect(peekReauthDraft()).toEqual({ key: 'user-edit', userId: 'u1', draft: { name: 'Ada' } })
    expect(sessionStorage.getItem('auth.returnPath')).toBe('/admin/users')
    expect(assign).toHaveBeenCalledWith('/oauth2/authorization/keycloak?max_age=0')
    unregister()
  })

  it('saves nothing and stays put when cancelled', async () => {
    const unregister = registerReauthForm('user-edit', () => ({ name: 'Ada' }))
    render(<ReauthModal />)
    let outcome: string | undefined
    void act(() => void requestReauthentication(oidc).then((o) => (outcome = o)))
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(outcome).toBe('cancelled')
    expect(peekReauthDraft()).toBeNull()
    expect(assign).not.toHaveBeenCalled()
    unregister()
  })

  it('leaves a marker when no form can be restored, so the person is told to repeat the change', async () => {
    render(<ReauthModal />)
    void act(() => void requestReauthentication(oidc))
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in again' }))
    expect(peekReauthDraft()).toEqual({ key: '', userId: 'u1', draft: null })
    expect(assign).toHaveBeenCalled()
  })

  it('confirms with a passkey in place and lets the original request go again', async () => {
    loginWithPasskey.mockResolvedValue(undefined)
    render(<ReauthModal />)
    let outcome: string | undefined
    void act(() => void requestReauthentication(passkey).then((o) => (outcome = o)))
    await userEvent.click(await screen.findByRole('button', { name: 'Use passkey' }))
    await vi.waitFor(() => expect(outcome).toBe('reauthenticated'))
    expect(assign).not.toHaveBeenCalled()
    expect(peekReauthDraft()).toBeNull()
  })

  it('stays open and says so when the passkey is not accepted', async () => {
    loginWithPasskey.mockRejectedValue(new Error('That passkey was not recognized.'))
    render(<ReauthModal />)
    void act(() => void requestReauthentication(passkey))
    await userEvent.click(await screen.findByRole('button', { name: 'Use passkey' }))
    expect(await screen.findByText('That passkey was not recognized.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use passkey' })).toBeInTheDocument()
  })

  it('tells the person to sign out and in again when the backend named no method', async () => {
    render(<ReauthModal />)
    void act(() => void requestReauthentication(new ReauthenticationRequiredError({ maxAge: 900 })))
    expect(await screen.findByText(/sign out and sign in again/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
