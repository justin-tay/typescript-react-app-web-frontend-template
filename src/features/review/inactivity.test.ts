import { describe, expect, it } from 'vitest'
import { inactivityLabel } from './inactivity'

const now = new Date('2026-10-10T12:00:00Z')

describe('inactivityLabel', () => {
  it('counts whole days from the last sign-in to now while the account is pending', () => {
    expect(inactivityLabel({ lastLoginAt: '2026-08-26T12:00:00Z' }, now)).toBe('Inactive 45 days')
    expect(inactivityLabel({ lastLoginAt: '2026-10-10T08:00:00Z' }, now)).toBe('Signed in today')
    expect(inactivityLabel({ lastLoginAt: '2026-10-08T08:00:00Z' }, now)).toBe('Inactive 2 days')
    expect(inactivityLabel({ lastLoginAt: '2026-10-09T12:00:00Z' }, now)).toBe('Inactive 1 day')
  })

  it('stops counting at the decision once the account is reviewed, and says so', () => {
    const item = { lastLoginAt: '2026-08-26T12:00:00Z', decidedAt: '2026-09-10T12:00:00Z' }
    expect(inactivityLabel(item, now)).toBe('Inactive 15 days when reviewed')
    expect(inactivityLabel({ ...item, decidedAt: '2026-08-26T18:00:00Z' }, now)).toBe('Active when reviewed')
  })

  it('has no number for an account that never signed in', () => {
    expect(inactivityLabel({ lastLoginAt: null }, now)).toBe('Never signed in')
    expect(inactivityLabel({}, now)).toBe('Never signed in')
  })
})
