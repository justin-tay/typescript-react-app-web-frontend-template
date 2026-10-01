import { describe, expect, it } from 'vitest'
import { roleLabel } from './user'

describe('roleLabel', () => {
  it('names the administration roles in words', () => {
    expect(roleLabel('ROLE_USER_MANAGE')).toBe('Manage users')
    expect(roleLabel('ROLE_ACCOUNT_REVIEWER')).toBe('Review accounts')
  })

  it('makes any other authority readable, with or without the ROLE_ prefix', () => {
    expect(roleLabel('ROLE_AUDIT_VIEWER')).toBe('Audit viewer')
    expect(roleLabel('SOMETHING_ELSE')).toBe('Something else')
  })
})
