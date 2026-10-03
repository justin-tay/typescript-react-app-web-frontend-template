/**
 * Candidate CSRF cookie names, most specific first. Over TLS the backend may prefix the cookie with
 * `__Host-`; browsers only store that name on a secure origin, so whichever exists is the right one.
 * The unprefixed name stays valid for plain HTTP and for TLS deployments that cannot use `__Host-`
 * (for example path-scoped cookies on a shared domain).
 */
const CSRF_COOKIES = ['__Host-XSRF-TOKEN', 'XSRF-TOKEN']
const CSRF_HEADER = 'X-XSRF-TOKEN'

function readCookie(name: string): string | undefined {
  const prefix = `${name}=`
  const entry = document.cookie.split('; ').find((c) => c.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : undefined
}

function readCsrfToken(): string | undefined {
  for (const name of CSRF_COOKIES) {
    const token = readCookie(name)
    if (token) return token
  }
  return undefined
}

/** The header the backend expects for a state-changing request, echoing its CSRF cookie. */
export function csrfHeaders(): Record<string, string> {
  const token = readCsrfToken()
  return token ? { [CSRF_HEADER]: token } : {}
}
