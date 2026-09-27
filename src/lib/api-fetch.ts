import { csrfHeaders } from './csrf'

export interface ApiFetchOptions {
  /** Retry once, with a freshly-read CSRF header, if the first attempt comes back 401. */
  retryOnceOn401?: boolean
}

/**
 * `fetch` with the app's CSRF header applied to writes (GET is exempt, matching Spring
 * Security's default CSRF filter). `csrfHeaders()` re-reads the cookie on every call, so a
 * retry after a response that rotated the session/CSRF cookie picks up the fresh value.
 */
export async function apiFetch(path: string, init: RequestInit = {}, options: ApiFetchOptions = {}): Promise<Response> {
  const method = init.method ?? 'GET'
  const isWrite = method !== 'GET'
  const send = () =>
    fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(isWrite ? csrfHeaders() : {}),
        ...init.headers,
      },
    })
  const response = await send()
  if (response.status === 401 && options.retryOnceOn401) return send()
  return response
}
