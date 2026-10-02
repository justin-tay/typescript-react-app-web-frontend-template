import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SessionTimeoutModal } from './SessionTimeoutModal'

const signOut = vi.fn()
const extendNow = vi.fn()

vi.mock('@/shared/session/auth-context', () => ({ useAuth: () => ({ signOut }) }))
vi.mock('@/shared/session/use-session-timeout', () => ({
  useSessionTimeout: () => ({ isPrompted: true, remainingMs: 30_000, extendError: null, extendNow }),
}))

describe('SessionTimeoutModal', () => {
  it('lets the person sign out straight away', async () => {
    render(<SessionTimeoutModal />)
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out now' }))
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(extendNow).not.toHaveBeenCalled()
  })

  it('lets the person stay signed in', async () => {
    render(<SessionTimeoutModal />)
    await userEvent.click(await screen.findByRole('button', { name: 'Stay signed in' }))
    expect(extendNow).toHaveBeenCalledTimes(1)
    expect(signOut).not.toHaveBeenCalled()
  })
})
