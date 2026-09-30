import { randomBytes } from 'node:crypto'
import type { Plugin } from 'vite'

/**
 * The value `html.cspNonce` stamps on every script and style tag Vite emits, in dev and in
 * `dist/index.html`. Whatever serves the page swaps it for a fresh random nonce on each response.
 */
export const CSP_NONCE_PLACEHOLDER = '__CSP_NONCE__'

/**
 * OUI bundles the sonner toast library, which appends two `<style>` tags at runtime and cannot be
 * given a nonce. Their hashes are allowed instead, so those two blocks run and no other inline
 * style does. A sonner upgrade changes the hashes: the console then reports the new ones.
 */
const SONNER_STYLE_HASHES = [
  'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=',
  'sha256-StEaX+se6YS7pqjzrzMIA0KaX9zF/8zAhvQXZAe5epY=',
]

/** A strict policy: scripts and styles run only with the response's nonce, and loaded code may load more. */
function policy(nonce: string) {
  return [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'nonce-${nonce}' ${SONNER_STYLE_HASHES.map((hash) => `'${hash}'`).join(' ')}`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    // The dev server's hot reload talks over a websocket on the same origin.
    `connect-src 'self' ws: wss:`,
  ].join('; ')
}

/**
 * Serves the dev server's pages under a strict Content Security Policy with a per-response nonce,
 * and reports (without blocking) anything that would break Trusted Types.
 */
export function strictCsp(): Plugin {
  return {
    name: 'strict-csp',
    config: () => ({ html: { cspNonce: CSP_NONCE_PLACEHOLDER } }),
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        const nonce = randomBytes(16).toString('base64')
        res.setHeader('Content-Security-Policy', policy(nonce))
        // Report-only: violations show in the browser console without breaking the page.
        res.setHeader('Content-Security-Policy-Report-Only', `require-trusted-types-for 'script'`)

        // Vite renders the page after this middleware, so swap the placeholder as it is written.
        const end = res.end.bind(res) as (chunk?: unknown, ...rest: unknown[]) => typeof res
        res.end = ((chunk?: unknown, ...rest: unknown[]) => {
          const type = String(res.getHeader('Content-Type') ?? '')
          if (type.includes('text/html') && (typeof chunk === 'string' || Buffer.isBuffer(chunk))) {
            const html = chunk.toString().replaceAll(CSP_NONCE_PLACEHOLDER, nonce)
            // The nonce differs per response, so a cached copy or a 304 would pair an old nonce with a new header.
            res.removeHeader('ETag')
            res.setHeader('Cache-Control', 'no-store')
            res.setHeader('Content-Length', Buffer.byteLength(html))
            return end(html, ...rest)
          }
          return end(chunk, ...rest)
        }) as typeof res.end
        next()
      })
    },
  }
}
