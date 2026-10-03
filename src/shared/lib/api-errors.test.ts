import { describe, expect, it } from 'vitest'
import { ApiError, ReauthenticationRequiredError, failureKind, throwForResponse } from './api-errors'

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

function problem(body: object, status = 401): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } })
}

async function caught(response: Response): Promise<unknown> {
  try {
    await throwForResponse(response)
  } catch (e) {
    return e
  }
  return undefined
}

describe('throwForResponse on a reauthentication-required 401', () => {
  it('carries the method, the window and the URI for an OIDC session', async () => {
    const e = await caught(
      problem({
        type: 'urn:problem:reauthentication-required',
        max_age: 900,
        method: 'oidc',
        reauthentication_uri: '/oauth2/authorization/keycloak?max_age=0',
      }),
    )
    expect(e).toBeInstanceOf(ReauthenticationRequiredError)
    expect(e).toMatchObject({
      method: 'oidc',
      maxAge: 900,
      reauthenticationUri: '/oauth2/authorization/keycloak?max_age=0',
    })
  })

  it('carries no URI for a passkey session', async () => {
    const e = await caught(problem({ type: 'urn:problem:reauthentication-required', max_age: 900, method: 'passkey' }))
    expect(e).toMatchObject({ method: 'passkey', maxAge: 900, reauthenticationUri: undefined })
  })

  it('carries no method for any other kind of session', async () => {
    const e = await caught(problem({ type: 'urn:problem:reauthentication-required', max_age: 900 }))
    expect(e).toMatchObject({ method: undefined, reauthenticationUri: undefined })
  })

  it.each(['https://evil.example/x', '//evil.example/x', 'javascript:alert(1)', 'oauth2/x'])(
    'drops a URI that is not a same-origin path: %s',
    async (uri) => {
      const e = await caught(
        problem({
          type: 'urn:problem:reauthentication-required',
          max_age: 900,
          method: 'oidc',
          reauthentication_uri: uri,
        }),
      )
      expect(e).toMatchObject({ reauthenticationUri: undefined })
    },
  )
})
