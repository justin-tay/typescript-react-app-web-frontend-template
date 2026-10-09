# ADR 0005: Strict Content Security Policy

## Status

Accepted

## Context

This app renders text that comes from people and from the backend: names, emails, group and role names. React escapes it, and the code has no `innerHTML`, `dangerouslySetInnerHTML` or `eval`, but a single mistake in one of those places, or in a dependency, would let an attacker run script in a signed-in administrator's session. A Content Security Policy is the second line of defence, and it only helps if it does not allow inline script or a list of hosts, which attackers routinely find a way around.

The app is a static single-page application. `index.html` has one `<script type="module">` and no inline script, so it can run under a strict policy. What a strict policy needs is a fresh random nonce on every response, which a static file cannot carry by itself.

## Decision

The Vite dev server serves every page under a nonce-based policy, so a change that breaks it fails in development rather than after deployment. The policy is built in `vite-plugin-csp.ts`:

- `script-src 'nonce-…' 'strict-dynamic'`: only scripts carrying the response's nonce run, and they may load further scripts. There is no host allow-list and no `'unsafe-inline'`.
- `style-src 'nonce-…'` plus two hashes in dev only (see below). No `'unsafe-inline'`.
- `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, `frame-ancestors 'none'`, and `connect-src 'self' ws: wss:` (the websocket is Vite's hot reload).
- Everything is same-origin because the backend and Keycloak flows are proxied, so no other origin is allowed.

- `require-trusted-types-for 'script'` and `trusted-types 'none'`: assigning a string to `innerHTML`, a script `src` or a similar sink throws a `TypeError`, and the page may create no Trusted Types policy. The app has no such sink of its own, so any violation is a new sink or a dependency that needs a decision, not something to allow quietly. There is no `default` policy and no sanitiser such as DOMPurify: nothing in the app renders HTML, and a sanitiser is for HTML that must be rendered.

The policy is enforced, not report-only.

**No inlined assets.** `vite.config.ts` sets `build.assetsInlineLimit: 0`. Vite would otherwise turn assets under 4 KiB into `data:` URIs, and the policy has no `data:` source, so an inlined image or font would be blocked in production only: the dev server never inlines, so it would not show the problem. Every asset stays a separate same-origin file.

The plugin sets Vite's `html.cspNonce` to the placeholder `__CSP_NONCE__`. Vite then puts `nonce="__CSP_NONCE__"` on every script and style tag it emits, in dev and in `dist/index.html`, and the dev middleware swaps the placeholder for a random nonce as the page is written. It also drops the `ETag` and sets `Cache-Control: no-store` on the page, because a cached copy or a `304` would pair an old nonce with a new header.

**Production contract.** `dist/index.html` contains the placeholder. Whatever serves it (the backend, a reverse proxy or a CDN function) must, on every response, generate a random nonce of at least 128 bits, replace every `__CSP_NONCE__` with it, send a `Content-Security-Policy` header with the same nonce (the same policy as above, without the websocket part of `connect-src`, and including the Trusted Types directives), and not cache the HTML. `frame-ancestors` is ignored in a `<meta>` tag, so it has to be a header.

The `<meta property="csp-nonce">` tag Vite adds is read only by Vite's own runtime, for the style and link tags it injects later. Other libraries do not read it.

The placeholder is a fixed, well-known string. That is safe here because `dist/index.html` is static and reflects nothing. If a server template or error page ever echoes user input into the HTML before the nonce is swapped in, an attacker could write `<script nonce="__CSP_NONCE__">` and receive the real nonce. In that case, set `html.cspNonce` to a random value per build instead.

**The style exception (dev only).** OUI depends on the sonner toast library. Sonner has no nonce option: it appends two `<style>` tags when its module loads, through an internal `__insertCSS`. In dev, Vite bundles OUI into one file without tree-shaking, so that code runs even though the app shows no toasts, and the console would report two blocked styles on every load. Their two SHA-256 hashes are in the dev `style-src`, so those two blocks run and no other inline style does. A sonner upgrade changes the hashes, and the console then names the new ones. The production build drops sonner entirely (its code and styles are absent from `dist/`), so the production policy does not include the hashes and should not until the app shows toasts. Once it does, sonner's styles load in production too and would be blocked, so toasts would render unstyled: that is the moment to allow the two hashes in the production policy, wrap the toaster, or use a different toast library.

Alternatives considered: a host allow-list (bypassable through any allowed host that serves script); `'unsafe-inline'` for styles (weakens `style-src` for the sake of one library); hash-based scripts for a static build (works without a server, but `strict-dynamic` with external module scripts needs integrity metadata on each, which the build does not produce); report-only CSP everywhere (violations would go unnoticed); allowing sonner's two style hashes in production before the app shows toasts (a hash to maintain for a library the app does not use); a `default` Trusted Types policy that accepts the empty string (react-aria's live announcer clears its logs with `innerHTML = ''`, but only through `clearAnnouncer`, which nothing in the app calls, so it is added if a violation shows up); and DOMPurify (it sanitises HTML that has to be rendered, and the app renders none).

## Consequences

Anything that adds an inline script, an inline style tag, `eval` or a script from another origin now fails in development. A `style` attribute set through React's `style` prop is fine, because CSP does not block styles set through the DOM.

On the sign-in screen, with the backend unreachable, there were no CSP violations and no Trusted Types reports. Pages behind sign-in were not exercised, since they need the backend. They are the most likely place for a violation, so check the console when working on them.

Trusted Types is enforced in dev with `trusted-types 'none'`. Vite's dev client breaks in one place: after a dev-server restart it polls for the server with `new SharedWorker(url)`, a script-URL sink, so the page does not reload by itself and needs a manual refresh. Ordinary hot reload is unaffected, and the production bundle does not contain the Vite client. React DOM and react-aria also contain sinks that the app does not reach: `dangerouslySetInnerHTML`, a `<script>` element, and `clearAnnouncer` (used only by a spin button). Using one of them throws, and the fix is to avoid the sink, not to add a policy. Older Firefox and Safari ignore the directives, so this is defence in depth.

Storybook runs on its own server and injects its own inline scripts. It is a developer tool, not the shipped app, so it is left without this policy.
