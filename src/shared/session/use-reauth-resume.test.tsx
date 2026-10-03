import { act, render, renderHook, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReauthReturnNotice } from './ReauthReturnNotice'
import { activeReauthForm } from './reauth'
import { peekReauthDraft, saveReauthDraft } from './reauth-stash'
import { useReauthResume } from './use-reauth-resume'

let userId = 'u1'
vi.mock('./auth-context', () => ({
  useAuth: () => ({ state: { status: 'authenticated', user: { id: userId } } }),
}))

describe('useReauthResume', () => {
  beforeEach(() => {
    sessionStorage.clear()
    userId = 'u1'
  })

  it('hands the form its saved draft once, for the same person', () => {
    saveReauthDraft({ key: 'user-edit', userId: 'u1', draft: { name: 'Ada' } })
    const onResume = vi.fn()
    const { result, rerender } = renderHook(() => useReauthResume('user-edit', { getDraft: () => ({}), onResume }))
    rerender()
    expect(onResume).toHaveBeenCalledTimes(1)
    expect(onResume).toHaveBeenCalledWith({ name: 'Ada' })
    expect(peekReauthDraft()).toBeNull()
    expect(result.current.notice).toBe("You're signed in again. Submitting your change…")
  })

  it('leaves another form’s draft alone', () => {
    saveReauthDraft({ key: 'group-edit', userId: 'u1', draft: {} })
    const onResume = vi.fn()
    renderHook(() => useReauthResume('user-edit', { getDraft: () => ({}), onResume }))
    expect(onResume).not.toHaveBeenCalled()
    expect(peekReauthDraft()).not.toBeNull()
  })

  it('does not submit for a different person, and says so', () => {
    saveReauthDraft({ key: 'user-edit', userId: 'someone-else', draft: {} })
    const onResume = vi.fn()
    const { result } = renderHook(() => useReauthResume('user-edit', { getDraft: () => ({}), onResume }))
    expect(onResume).not.toHaveBeenCalled()
    expect(peekReauthDraft()).toBeNull()
    expect(result.current.notice).toBe("You signed in as a different user, so your change wasn't submitted.")
  })

  it('replaces the notice once the form knows how the submit went', () => {
    saveReauthDraft({ key: 'user-edit', userId: 'u1', draft: {} })
    const { result } = renderHook(() => useReauthResume('user-edit', { getDraft: () => ({}), onResume: vi.fn() }))
    act(() => result.current.finish(false))
    expect(result.current.notice).toBe(
      "You're signed in again, but your change couldn't be saved. Fix the errors below and submit again.",
    )
    act(() => result.current.finish(true))
    expect(result.current.notice).toBeNull()
  })

  it('registers the form’s draft while mounted and forgets it after', () => {
    const { unmount } = renderHook(() =>
      useReauthResume('user-edit', { getDraft: () => ({ a: 1 }), onResume: vi.fn() }),
    )
    expect(activeReauthForm()).toMatchObject({ key: 'user-edit' })
    expect(activeReauthForm()?.getDraft()).toEqual({ a: 1 })
    unmount()
    expect(activeReauthForm()).toBeNull()
  })
})

describe('ReauthReturnNotice', () => {
  beforeEach(() => {
    sessionStorage.clear()
    userId = 'u1'
  })

  it('asks the person to repeat a change whose form could not be restored', () => {
    saveReauthDraft({ key: '', userId: 'u1', draft: null })
    render(<ReauthReturnNotice />)
    expect(screen.getByText("You're signed in again. Please repeat your change.")).toBeInTheDocument()
    expect(peekReauthDraft()).toBeNull()
  })

  it('says nothing when nothing was pending', () => {
    render(<ReauthReturnNotice />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not touch a draft a form is going to restore', () => {
    saveReauthDraft({ key: 'user-edit', userId: 'u1', draft: {} })
    render(<ReauthReturnNotice />)
    expect(peekReauthDraft()).not.toBeNull()
  })
})
