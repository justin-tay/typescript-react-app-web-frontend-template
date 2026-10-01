import { describe, expect, it } from 'vitest'
import { pathSegment } from './api-request'

describe('pathSegment', () => {
  it('leaves an ordinary id alone', () => {
    expect(pathSegment('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(pathSegment('u1')).toBe('u1')
  })

  it.each([
    ['../groups', '..%2Fgroups'],
    ['a/b', 'a%2Fb'],
    ['x?admin=true', 'x%3Fadmin%3Dtrue'],
    ['x#fragment', 'x%23fragment'],
    ['a b', 'a%20b'],
    ['%2e%2e', '%252e%252e'],
  ])('keeps %s inside one path segment', (value, expected) => {
    expect(pathSegment(value)).toBe(expected)
  })

  it('cannot be turned back into a different path by the browser', () => {
    const url = new URL(`/api/admin/users/${pathSegment('../groups')}`, 'http://localhost')

    expect(url.pathname).toBe('/api/admin/users/..%2Fgroups')
  })
})
