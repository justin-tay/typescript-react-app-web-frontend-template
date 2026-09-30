# ADR 0005: Strict Content Security Policy

## Status

Accepted

## Context

This app renders text that comes from people and from the backend: names, emails, group and role names. React escapes it, and the code has no `innerHTML`, `dangerouslySetInnerHTML` or `eval`, but a single mistake in one of those places, or in a dependency, would let an attacker run script in a signed-in administrator's session. A Content Security Policy is the second line of defence, and it only helps if it does not allow inline script or a list of hosts, which attackers routinely find a way around.

The app is a static single-page application. `index.html` has one `<script type="module">` and no inline script, so it can run under a strict policy. What a strict policy needs is a fresh random nonce on every response, which a static file cannot carry by itself.

## Decision

The Vite dev server serves every page under a nonce-based policy, so a change that breaks it fails in development rather than after deployment. The policy is built in `vite-plugin-csp.ts`:

- `script-src 'nonce-…' 'strict-dynamic'`: only scripts carrying the response's nonce run, and they may load further scripts. There is no host allow-list and no `'unsafe-inline'`.
- `style-src 'nonce-…'` plus two hashes (see below). No `'unsafe-inline'`.
- `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, and `connect-src 'self' ws: wss:` (the websocket is Vite's hot reload).
- Everything is same-origin because the backend and Keycloak flows are proxied, so no other origin is allowed.

The policy is enforced, not report-only. Trusted Types (`require-trusted-types-for 'script'`) is sent report-only, so violations appear in the console without breaking the page.

The plugin sets Vite's `html.cspNonce` to the placeholder `__CSP_NONCE__`. Vite then puts `nonce="__CSP_NONCE__"` on every script and style tag it emits, in dev and in `dist/index.html`, and the dev middleware swaps the placeholder for a random nonce as the page is written. It also drops the `ETag` and sets `Cache-Control: no-store` on the page, because a cached copy or a `304` would pair an old nonce with a new header.

**Production contract.** `dist/index.html` contains the placeholder. Whatever serves it (the backend, a reverse proxy or a CDN function) must, on every response, generate a random nonce of at least 128 bits, replace every `__CSP_NONCE__` with it, send a `Content-Security-Policy` header with the same nonce (the same policy as above, without the websocket part of `connect-src`), and not cache the HTML. `frame-ancestors` is ignored in a `<meta>` tag, so it has to be a header.

The `<meta property="csp-nonce">` tag Vite adds is read only by Vite's own runtime, for the style and link tags it injects later. Other libraries do not read it.

The placeholder is a fixed, well-known string. That is safe here because `dist/index.html` is static and reflects nothing. If a server template or error page ever echoes user input into the HTML before the nonce is swapped in, an attacker could write `<script nonce="__CSP_NONCE__">` and receive the real nonce. In that case, set `html.cspNonce` to a random value per build instead.

**The style exception (dev only).** OUI depends on the sonner toast library. Sonner has no nonce option: it appends two `<style>` tags when its module loads, through an internal `__insertCSS`. In dev, Vite bundles OUI into one file without tree-shaking, so that code runs even though the app shows no toasts, and the console reports two blocked styles. Their two SHA-256 hashes are in the dev `style-src`, so those two blocks run and no other inline style does. A sonner upgrade changes the hashes, and the console then names the new ones. The production build drops sonner entirely (its code and styles are absent from `dist/`), so the production policy needs no hashes. If the app ever shows toasts, sonner's styles will be loaded in production too and will need the same two hashes, or a different toast library.

Alternatives considered: a host allow-list (bypassable through any allowed host that serves script); `'unsafe-inline'` for styles (weakens `style-src` for the sake of one library); hash-based scripts for a static build (works without a server, but `strict-dynamic` with external module scripts needs integrity metadata on each, which the build does not produce); report-only CSP everywhere (violations would go unnoticed).

## Consequences

Anything that adds an inline script, an inline style tag, `eval` or a script from another origin now fails in development. A `style` attribute set through React's `style` prop is fine, because CSP does not block styles set through the DOM.

On the sign-in screen, with the backend unreachable, there were no CSP violations and no Trusted Types reports. Pages behind sign-in were not exercised, since they need the backend. They are the most likely place for a violation, so check the console when working on them.

Trusted Types is report-only because enforcing it was not tried beyond that. If the app stays clean, switch the header to enforcing; the risk is Vite's own dev client, which creates script elements, so the production policy may enforce it even if the dev server cannot.

Storybook runs on its own server and injects its own inline scripts. It is a developer tool, not the shipped app, so it is left without this policy.
