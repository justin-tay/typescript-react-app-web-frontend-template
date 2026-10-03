import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveReauthDraft } from '@/shared/session/reauth-stash'
import { AccountSigningIn } from './AccountSigningIn'

const registerPasskey = vi.fn()
vi.mock('./api', () => ({
  listPasskeys: () => Promise.resolve([]),
  deletePasskey: vi.fn(),
  renamePasskey: vi.fn(),
}))
vi.mock('./webauthn', () => ({
  isWebAuthnSupported: () => true,
  registerPasskey: (...args: unknown[]) => registerPasskey(...args),
}))
vi.mock('@/shared/session/auth-context', () => ({
  useAuth: () => ({ state: { status: 'authenticated', user: { id: 'u1' } } }),
}))

describe('adding a passkey after signing in again', () => {
  beforeEach(() => sessionStorage.clear())

  it('reopens the form with the name typed, and waits for the person to continue', async () => {
    saveReauthDraft({ key: 'add-passkey', userId: 'u1', draft: { label: 'Laptop' } })
    render(<AccountSigningIn />)
    expect(await screen.findByRole('textbox', { name: /Name this passkey/ })).toHaveValue('Laptop')
    expect(screen.getByText("You're signed in again. Continue adding your passkey.")).toBeInTheDocument()
    expect(registerPasskey).not.toHaveBeenCalled()
  })
})
