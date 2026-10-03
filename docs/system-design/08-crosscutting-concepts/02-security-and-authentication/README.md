# 8.2 Security and Authentication

<!-- arc42: Authentication mechanism, authorization model, credential management -->

<!-- arc42-generated -->

This concept describes what the **browser side** does and what it relies on the backend and the page host to do. Where the browser cannot enforce something, it says so.

## Responsibilities

| Concern                                                        | Owned by                             | In this repository                                                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authenticating a person (passwords, SSO, passkey verification) | Keycloak and the backend             | Only starts the flow: a full-page navigation to `/oauth2/authorization/keycloak`, or the WebAuthn ceremony in the browser.                           |
| The session                                                    | Backend (server-side session cookie) | The browser never reads it; it only learns whether it exists from `GET /api/login-user` (200 or 401).                                                |
| Authorization of every request                                 | Backend                              | `RequireAdmin`, the role-filtered sidebar and disabled controls avoid offering what would be refused. They are not a security boundary.              |
| CSRF defence                                                   | Backend and frontend                 | The frontend echoes the `XSRF-TOKEN` cookie as `X-XSRF-TOKEN` on every non-GET request.                                                              |
| Script and style injection                                     | Frontend build and page host         | Nonce-based CSP, enforced by the dev server and required of the host (see below). No `innerHTML`, `dangerouslySetInnerHTML` or `eval` in the source. |
| Transport security, response headers                           | Page host                            | Not in this repository. See "Production contract".                                                                                                   |

## Authentication flow

1. On load the app calls `GET /api/login-user`. `401` means signed out; `200` returns the user and their authorities.
2. `AuthGate` shows the sign-in card in place of whatever page was asked for (ADR 0004). The address never changes.
3. **SSO:** `Login` remembers the requested path in `sessionStorage` (`auth.returnPath`) and navigates to the backend's OAuth path. Keycloak returns to `/`, where `AuthGate` consumes the saved path and navigates on.
4. **Passkey:** the browser runs `navigator.credentials.get` with options from Spring Security; the signed assertion is posted to `/api/login/webauthn`; success starts a new session and the app reloads its user.
5. **Sign out:** `POST /api/logout` with the CSRF header returns a Keycloak logout URL; the browser navigates there so Keycloak ends its own session too.

## Session lifecycle

| Mechanism         | Behaviour                                                                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idle warning      | `SessionTimeoutMonitor` counts down to the backend's idle deadline (`SESSION_IDLE_TIMEOUT_MS`, mirrored by hand), prompts before it, and extends silently if the person was recently active.                                                                                                 |
| Activity          | Every successful API call counts as activity, as it does on the backend. For that reason **background polling must not be added** without a way to mark it as non-activity.                                                                                                                  |
| End of session    | Any request that returns `401` (other than a re-authentication request) declares the session over. Every open tab then shows the sign-in card in place (a `BroadcastChannel`), and saved list state is cleared in each tab.                                                                  |
| Absolute timeout  | Not warned about (it cannot be extended); discovered by the next request returning `401`.                                                                                                                                                                                                    |
| Re-authentication | A write the backend rejects as `reauthentication-required` opens a dialog saying a recent sign-in is needed, then signs in at Keycloak (`reauthentication_uri` from the `401`, with the open form saved and restored for the same person) or confirms with a passkey in place. See ADR 0007. |

## Data kept in the browser

| Where                                  | What                                                    | Cleared                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionStorage` `table-state:*`       | A list's search text, filters, sort, page size and page | On sign-out, session end in any tab, or tab close. Search text can identify a person, so clearing is part of the behaviour and is tested. |
| `sessionStorage` `auth.returnPath`     | The page to return to after SSO                         | When consumed.                                                                                                                            |
| `sessionStorage` `auth.sessionExpired` | Whether the card should say the session expired         | On sign-in or deliberate sign-out.                                                                                                        |
| `sessionStorage` `review-tab:*`        | The selected tab on a review task                       | Tab close.                                                                                                                                |
| Cookies                                | Session (not readable by script), `XSRF-TOKEN`          | Backend-controlled.                                                                                                                       |
| `localStorage`, IndexedDB              | Nothing                                                 |                                                                                                                                           |

All storage reads and writes of view state are wrapped so an unavailable or full storage does not break the app.

## Content Security Policy

The policy is built in `vite-plugin-csp.ts` and applies to the **dev server** (ADR 0005): `default-src 'self'`; `script-src` with a per-response nonce and `'strict-dynamic'`; `style-src` with the nonce plus two hashes for OUI's toast library; `object-src 'none'`; `base-uri 'none'`; `form-action 'self'`; `frame-ancestors 'none'`; `connect-src 'self' ws: wss:`. A Trusted Types policy is sent report-only.

### Production contract

`dist/index.html` carries the placeholder `__CSP_NONCE__` on its script and style tags. Whatever serves it must, on **every** response, replace the placeholder with a fresh random value, send a `Content-Security-Policy` header with the same nonce, and not cache the page. Nothing in this repository enforces that. See section 11.

## Error handling

Failures are mapped once (`failureKind`): no response, or a 502, 503 or 504, is "unavailable"; anything else is "failed". Pages show a plain notice and a retry. A 403 shows a fixed "You do not have permission to do this." message. Other API messages (the problem detail for validation and conflict errors) are shown as the backend wrote them, so the backend must not put sensitive detail in them; developer detail from unexpected errors goes to the console only.

## Dependencies and supply chain

Runtime dependencies are few and direct (React, React Router, OUI and React Aria, TanStack Table, Tailwind, lucide). No third-party scripts, fonts or analytics are loaded from other origins; the CSP would block them.

## Open items

A security review of the browser side was done on 2026-10-01. It fixed two issues in code: saved list state is now cleared whenever nobody is signed in, including at start-up, and the logout address returned by the backend is refused unless it is an `http` or `https` address. Two items remain open and are recorded in [section 11](../../11-risks-and-technical-debt.md): the production CSP and header contract (risk 1) and the placeholder footer links (risk 6). Control-by-control mappings sit beside this file: [Sessions](sessions.md), [HTTP security headers](headers.md) and the [ASVS mapping](asvs.md).
<!-- /arc42-generated -->

<!-- arc42-manual: Add the organisation's security requirements, threat model and review results -->
<!-- /arc42-manual -->
