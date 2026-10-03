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

  describe('CSRF cookie name', () => {
    function stubCookie(value: string) {
      vi.spyOn(document, 'cookie', 'get').mockReturnValue(value)
    }

    async function writeHeaders() {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)
      await apiFetch('/api/thing', { method: 'POST' })
      return fetchMock.mock.calls[0][1].headers as Record<string, string>
    }

    afterEach(() => vi.restoreAllMocks())

    it('reads the __Host- prefixed cookie', async () => {
      stubCookie('__Host-XSRF-TOKEN=host-token')
      expect((await writeHeaders())['X-XSRF-TOKEN']).toBe('host-token')
    })

    it('prefers the __Host- cookie over a stale unprefixed one', async () => {
      stubCookie('XSRF-TOKEN=stale; __Host-XSRF-TOKEN=host-token')
      expect((await writeHeaders())['X-XSRF-TOKEN']).toBe('host-token')
    })

    it('falls back to the unprefixed cookie', async () => {
      stubCookie('other=1; XSRF-TOKEN=plain-token')
      expect((await writeHeaders())['X-XSRF-TOKEN']).toBe('plain-token')
    })

    it('sends no header when neither cookie exists', async () => {
      stubCookie('other=1')
      expect((await writeHeaders())['X-XSRF-TOKEN']).toBeUndefined()
    })
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
