import { describe, expect, it } from 'vitest'
import { ApiError, failureKind } from './api-errors'

describe('failureKind', () => {
  it.each([502, 503, 504])('treats a gateway %i as unavailable', (status) => {
    expect(failureKind(new ApiError('x', status))).toBe('unavailable')
  })

  it('treats a fetch that never got a response as unavailable', () => {
    expect(failureKind(new TypeError('Failed to fetch'))).toBe('unavailable')
  })

  it.each([400, 401, 403, 404, 500])('treats %i as a plain failure', (status) => {
    expect(failureKind(new ApiError('x', status))).toBe('failed')
  })

  it('treats an unknown error as a plain failure', () => {
    expect(failureKind(new Error('x'))).toBe('failed')
    expect(failureKind('x')).toBe('failed')
  })
})
