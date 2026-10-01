import { describe, expect, it } from 'vitest'
import { humanize } from './labels'

describe('humanize', () => {
  it('turns snake case and upper case identifiers into a sentence-case label', () => {
    expect(humanize('pending_verification')).toBe('Pending verification')
    expect(humanize('ACCOUNT_REVIEWER')).toBe('Account reviewer')
    expect(humanize('suspend_user')).toBe('Suspend user')
    expect(humanize('rolesAdded')).toBe('Roles added')
  })

  it('leaves a single word alone and handles an empty string', () => {
    expect(humanize('verified')).toBe('Verified')
    expect(humanize('')).toBe('')
  })
})
