import { describe, expect, it } from 'vitest'
import { hasPermission, isAdmin, permissionLabel } from './user'

const person = (...permissions: string[]) => ({ id: '1', username: 'a', name: 'A', permissions })

describe('permissionLabel', () => {
  it('reads a permission as words', () => {
    expect(permissionLabel('user:add-role')).toBe('User: add role')
    expect(permissionLabel('review:decide')).toBe('Review: decide')
  })
})

describe('permissions', () => {
  it('checks a held permission', () => {
    expect(hasPermission(person('user:read'), 'user:read')).toBe(true)
    expect(hasPermission(person('user:read'), 'user:create')).toBe(false)
  })

  it('treats any administration permission as admin', () => {
    expect(isAdmin(person('audit:read'))).toBe(true)
    expect(isAdmin(person('something:else'))).toBe(false)
    expect(isAdmin(person())).toBe(false)
  })
})
