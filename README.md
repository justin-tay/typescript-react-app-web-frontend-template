# Web frontend template

React + TypeScript + Vite frontend built with [OUI](https://oui.open.gov.sg) components. It demonstrates user login against `java-app-web-api-server-template`.

## Pages

- `/` public landing page.
- `/login` login card. Keycloak returns here (`/login?logout`) after logout.
- `/account` the signed-in user's personal info (read-only — see below), and `/account/security` their passkeys, inside a small local nav (`AccountLayout`). A logged-out visitor is sent to `/login`, then back to whichever of these they came from.
- `/users`, `/groups`, `/roles` admin tables with create/edit/delete, inside their own full-width, left-nav shell (`AdminLayout`). Each requires the backend's matching authority (`USER_MANAGE`, `GROUP_MANAGE`, `ROLE_MANAGE`) and shows a warning otherwise. A user's roles come from their groups, not directly, so the users form picks groups and the groups form picks roles. Display name and email are read-only once a user exists, for the same reason as personal info below.

The app name, footer links and copyright holder are constants in `src/config.ts`. The footer links are `#` placeholders: a .gov.sg service must point the privacy and terms links at real pages.

## Identity is delegated to Keycloak

A person's name and email are never editable anywhere in this app — not on `/account`, and not from the admin console — because the backend's own terms call this "Delegated to Keycloak": a capability the application deliberately never implements, full stop. `GET /api/account` is read-only. If a deployment wants in-app profile editing, that is new backend work (forwarding to Keycloak's account REST API), not a gap in this frontend.

## Passkeys

`/account/security` is a self-service passkey manager (list, rename, add, delete), backed by Spring Security's own WebAuthn endpoints and the backend's `/account/passkeys` (see docs/adr/0024 in the backend). The feature is off by default; the backend's `local` profile now enables it for `http://localhost:5173`. `src/account/webauthn.ts` hand-rolls the browser ceremony (`navigator.credentials.create`) and the base64url conversions it needs, since neither Spring Security nor this template bundles a client-side WebAuthn library.

Registering a passkey needs a recent login, same as an admin write (see below) — the backend answers a stale session with the same `reauthentication-required` problem.

If `/api/account/passkeys` 404s, the page assumes the feature is disabled on that backend and says so, rather than showing an error.

## Re-authentication for sensitive writes

Every admin create/update/delete, and registering a passkey, needs a login within a time window the backend configures; a stale one is answered with a `reauthentication-required` problem. `src/admin/reauth.ts` sends the browser to log in again (`/oauth2/authorization/keycloak?max_age=0`), remembering the current page in `sessionStorage` so the visitor lands back on it — not back inside the form they had open, which is not restored. `src/lib/use-mutation.ts` is what every such form uses to turn a write's result into this redirect, per-field validation messages, or one error message. The same `sessionStorage` mechanism (`src/auth/return-path.ts`) also sends an anonymous visitor back to the protected page they first asked for, once they log in (see `RequireAuth`).

Some admin actions are also rejected with a plain `access-denied` 403 by the backend's own business rules (for example, granting a role the signed-in administrator does not hold, or changing their own access) — this is expected, and the app shows the backend's message for it.

## Idle-timeout warning, synced across tabs

The backend ends an idle session after `server.servlet.session.timeout` (15 minutes by default; see its `application.yaml`/`commons-defaults.yaml`). `src/auth/session-timeout.ts`'s `SessionTimeoutMonitor` mirrors that as `SESSION_IDLE_TIMEOUT_MS` in `src/config.ts` — there is no backend endpoint that reports it, so this constant must be kept in sync by hand if a deployment changes the backend's value. `SESSION_PROMPT_BEFORE_MS` (60 seconds) is how long before the deadline `SessionTimeoutModal` asks whether to stay signed in.

It is decentralized on purpose: every open tab keeps its own countdown to the same deadline and a `BroadcastChannel` tells the others whenever it moves, rather than electing one tab to own a single canonical timer (which would need a failover case for when that tab closes). Moving your mouse or pressing a key counts as activity, the same as the backend's own idle timer would if the movement caused a request — but it is not sent to the server on every event; only at the moment a prompt would otherwise be shown does the monitor check for recent local activity, and if there is any, it silently re-fetches `/login-user` to reset the timer instead of interrupting anyone still visibly there. An ordinary API call from any tab (an admin table loading, a passkey being renamed, and so on) also counts as activity and quietly dismisses the prompt everywhere, exactly as it would reset the backend's own idle timer.

This deliberately never involves the backend's separate, non-extendable absolute session timeout — there is nothing to warn about early there, since activity can't push it out. Whenever any request does come back 401 for a real reason (the idle timeout despite the warning, the absolute timeout, an admin revoking the session, or a login superseding this one elsewhere — Spring Security allows only one session per user), `src/auth/session-broadcast.ts` sends every open tab, not just the one that saw the 401, to the same `/login?logout` page a normal logout shows. `AuthProvider` is careful to only declare this for a tab that really was signed in before; a page that was never authenticated just shows its ordinary logged-out state, no message implied.

## How login works

The backend is an OIDC client (Keycloak) that keeps a server-side session cookie, so the browser must see a single origin. `vite.config.ts` proxies two kinds of paths to the backend (`BACKEND_URL`, default `http://localhost:8081`):

- `/oauth2/*` and `/login/oauth2/*`, at their real backend paths. These can't move: Keycloak's registered redirect URI depends on Spring Security's fixed `{baseUrl}/login/oauth2/code/keycloak`.
- Everything else the frontend calls with `fetch`, under `/api/*`, with the prefix stripped before forwarding. Keeping these away from the app's own page paths means a page route (like `/users`) can never collide with a backend path the way `/admin/users` once did here.

- On load the app calls `GET /api/login-user`: 200 means logged in, 401 means logged out.
- **Log in** navigates to `/oauth2/authorization/keycloak`; Keycloak authenticates and returns through the proxy.
- **Log out** sends `POST /api/logout` with `Accept: application/json` and the `XSRF-TOKEN` cookie echoed in the `X-XSRF-TOKEN` header. The backend answers `{"logoutUrl": ...}` and the app navigates there so Keycloak ends its own session too.
- Admin calls go to `/api/admin/*`, for example `GET /api/admin/users`.

## Running locally

1. Start Keycloak and the backend (`local` profile) per the backend repo's `bin/` scripts.
2. Run the backend's `bin/configure-keycloak.sh`. It registers this dev server (`FRONTEND_BASE_URL`, default `http://localhost:5173`) as an extra redirect, post-logout redirect and web origin on the `java-app-web-api-server` client. Keycloak matches these exactly, so the dev server uses port 5173 with `strictPort`.
3. The backend must honour `X-Forwarded-*` headers so its redirect URIs use `localhost:5173`.
4. `npm install && npm run dev`, then open http://localhost:5173.

Log in with a development user from the backend's `bin/seed-test-data.js` (see the backend README).

## Scripts

`npm run dev`, `npm run build`, `npm test` (Vitest), `npm run lint` (oxlint).
