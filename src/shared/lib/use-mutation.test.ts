import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReauthenticationRequiredError } from './api-errors'
import { useMutation } from './use-mutation'

const requestReauthentication = vi.fn()
vi.mock('@/shared/session/reauth', () => ({
  requestReauthentication: (details: unknown) => requestReauthentication(details),
}))

const reauth = () => new ReauthenticationRequiredError({ method: 'passkey', maxAge: 900 })

describe('useMutation when a change needs a recent sign-in', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks the person to confirm, then sends the same change again', async () => {
    requestReauthentication.mockResolvedValue('reauthenticated')
    const fn = vi.fn().mockRejectedValueOnce(reauth()).mockResolvedValueOnce('saved')
    const { result } = renderHook(() => useMutation(fn))

    let outcome
    await act(async () => {
      outcome = await result.current.run('a', 1)
    })

    expect(requestReauthentication).toHaveBeenCalledWith(expect.objectContaining({ method: 'passkey', maxAge: 900 }))
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('a', 1)
    expect(outcome).toEqual({ ok: true, value: 'saved' })
    expect(result.current.error).toBeNull()
  })

  it('does nothing more, and shows no error, when the person cancels', async () => {
    requestReauthentication.mockResolvedValue('cancelled')
    const fn = vi.fn().mockRejectedValue(reauth())
    const { result } = renderHook(() => useMutation(fn))

    let outcome
    await act(async () => {
      outcome = await result.current.run()
    })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(outcome).toEqual({ ok: false })
    expect(result.current.error).toBeNull()
  })

  it('reports it rather than asking again if the change is still refused after confirming', async () => {
    requestReauthentication.mockResolvedValue('reauthenticated')
    const fn = vi.fn().mockRejectedValue(reauth())
    const { result } = renderHook(() => useMutation(fn))

    await act(async () => {
      await result.current.run()
    })

    expect(requestReauthentication).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(result.current.error?.message).toBe('Please sign in again to make this change.')
  })
})
