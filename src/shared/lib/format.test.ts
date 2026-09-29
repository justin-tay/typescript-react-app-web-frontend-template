import { describe, expect, it } from 'vitest'
import { formatDateTime } from './format'

describe('formatDateTime', () => {
  it('shows day, month, year and 24-hour time', () => {
    expect(formatDateTime('2025-09-21T01:12:00Z')).toMatch(/^2[01] Sept? 2025, \d{2}:\d{2}$/)
  })
})
