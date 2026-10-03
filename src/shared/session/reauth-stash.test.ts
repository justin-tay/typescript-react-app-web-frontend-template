import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearReauthDraft, peekReauthDraft, saveReauthDraft } from './reauth-stash'

const TEN_MINUTES = 10 * 60 * 1000

describe('reauth stash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
  })
  afterEach(() => vi.useRealTimers())

  it('hands back what was saved, with the user it was saved for', () => {
    saveReauthDraft({ key: 'user-edit', userId: 'u1', draft: { name: 'Ada' } })
    expect(peekReauthDraft()).toEqual({ key: 'user-edit', userId: 'u1', draft: { name: 'Ada' } })
  })

  it('has nothing when nothing was saved', () => {
    expect(peekReauthDraft()).toBeNull()
  })

  it('keeps one draft: a second save replaces the first', () => {
    saveReauthDraft({ key: 'a', userId: 'u1', draft: 1 })
    saveReauthDraft({ key: 'b', userId: 'u1', draft: 2 })
    expect(peekReauthDraft()).toMatchObject({ key: 'b', draft: 2 })
  })

  it('forgets a draft once cleared', () => {
    saveReauthDraft({ key: 'a', userId: 'u1', draft: 1 })
    clearReauthDraft()
    expect(peekReauthDraft()).toBeNull()
  })

  it('drops a draft older than ten minutes', () => {
    saveReauthDraft({ key: 'a', userId: 'u1', draft: 1 })
    vi.advanceTimersByTime(TEN_MINUTES - 1)
    expect(peekReauthDraft()).not.toBeNull()
    vi.advanceTimersByTime(2)
    expect(peekReauthDraft()).toBeNull()
  })

  it('ignores a corrupt entry', () => {
    sessionStorage.setItem('auth.reauthDraft', '{not json')
    expect(peekReauthDraft()).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveReauthDraft({ key: 'a', userId: 'u1', draft: 1 })).not.toThrow()
    vi.restoreAllMocks()
  })
})
