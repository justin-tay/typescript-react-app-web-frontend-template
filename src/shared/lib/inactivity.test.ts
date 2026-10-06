import { describe, expect, it } from 'vitest'
import { inactiveDays } from './inactivity'

const now = new Date('2026-10-10T12:00:00Z')

describe('inactiveDays', () => {
  it('counts whole days from the last activity to now while the account is pending', () => {
    expect(inactiveDays({ lastActivityAt: '2026-08-26T12:00:00Z' }, now)).toBe(45)
    expect(inactiveDays({ lastActivityAt: '2026-10-10T08:00:00Z' }, now)).toBe(0)
    expect(inactiveDays({ lastActivityAt: '2026-10-09T12:00:00Z' }, now)).toBe(1)
  })

  it('stops counting where it ended, so a decided row does not shift', () => {
    const item = { lastActivityAt: '2026-08-26T12:00:00Z', endedAt: '2026-09-10T12:00:00Z' }
    expect(inactiveDays(item, now)).toBe(15)
    expect(inactiveDays(item, new Date('2027-01-01T00:00:00Z'))).toBe(15)
  })

  it('is unknown, not zero, when there is no last activity', () => {
    expect(inactiveDays({ lastActivityAt: null }, now)).toBeNull()
    expect(inactiveDays({}, now)).toBeNull()
  })
})
