import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api-fetch'

function setCsrfCookie(token: string) {
  document.cookie = `XSRF-TOKEN=${token}`
}

function clearCookies() {
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

describe('apiFetch', () => {
  afterEach(() => {
    clearCookies()
    vi.unstubAllGlobals()
  })

  it('does not add a CSRF header to a GET request', async () => {
    setCsrfCookie('token-1')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/thing')

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(headers['X-XSRF-TOKEN']).toBeUndefined()
  })

  it('adds the current CSRF cookie value as a header on a write', async () => {
    setCsrfCookie('token-1')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/thing', { method: 'POST' })

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>
    expect(headers['X-XSRF-TOKEN']).toBe('token-1')
  })

  it('does not retry a 401 unless retryOnceOn401 is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await apiFetch('/api/thing', { method: 'POST' })

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries once on 401 with the refreshed CSRF cookie when retryOnceOn401 is set', async () => {
    setCsrfCookie('stale-token')
    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      // Simulate the 401 response rotating the session, which rotates the CSRF cookie too.
      setCsrfCookie('fresh-token')
      return new Response(null, { status: 401 })
    })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await apiFetch('/api/thing', { method: 'POST' }, { retryOnceOn401: true })

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondCallHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>
    expect(secondCallHeaders['X-XSRF-TOKEN']).toBe('fresh-token')
  })

  it('does not retry a second 401 when retryOnceOn401 is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await apiFetch('/api/thing', { method: 'POST' }, { retryOnceOn401: true })

    expect(response.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
