# Web frontend template

React + TypeScript + Vite frontend built with [OUI](https://oui.open.gov.sg) components. It demonstrates user sign-in against `java-app-web-api-server-template`.

## Pages

Everything needs a signed-in user. There is no separate login page: `AuthGate` shows the sign-in card at whatever address was asked for (see [ADR 0004](docs/adr/0004-show-sign-in-in-place.md)), and the same happens in every open tab when the session ends. If Keycloak is down when someone clicks "Sign in with SSO", the backend redirects the browser to `/?error=identity_provider_unavailable`; the card then shows a warning (the passkey button still works) and drops the parameter from the address.

- `/` the signed-in home: a greeting by name ("Good morning, Ada Lovelace") and links to the account pages.
- `/account/personal-info` the signed-in user's personal info (read-only, see below), and `/account/signing-in` their sign-in methods, which are passkeys ("Configure ways to sign in"). Both are reached from the account menu at the top right, and both are also mounted at `/admin/account/…` so an administrator stays in the admin shell. `/account` itself has no page.
- `/admin` an admin overview: total, active and never-signed-in users and the number of roles, each card opening the matching list. `/admin/users` and `/admin/roles` are tables with search, create, edit and delete, `/admin/permissions` is the read-only list of the seeded permissions (with a privileged filter), `/admin/reviews` (with `/admin/reviews/:taskId`) is the account review, `/admin/audit` the audit trail, `/admin/settings` the inactivity and review settings, and `/admin/users/:id` and `/admin/roles/:id` are detail pages with tabs (a user's details and roles; a role's members and permissions, grouped by domain with the privileged ones marked). They use the same shell as the account pages (`AppShell`), with a left nav and breadcrumbs added by `AdminLayout`.
- Administration is for people who hold an administration permission (`login-user` returns `permissions` such as `user:read` or `review:decide`, the backend's `domain:action` names). Anyone else who opens `/admin` is told they do not have access, and the sidebar, overview, buttons and form fields show only what the person holds a permission for (`hasPermission` in `shared/session/user.ts`); the server still decides, and its 403 (granting a privileged permission you do not hold, changing your own roles), 409 (separation of duties: `review:decide` cannot be held with a privileged permission) and reauthentication answers are shown as its message. Nothing in the account pages links to `/admin`: administrators know to go there. The admin menu does link to the account pages (under `/admin/account`), so in a real deployment where they are separate apps, drop those two routes or point the menu items at the other app. A user holds roles and a role holds permissions, so the users form picks roles and the roles form picks permissions; a user is _privileged_ when any of their roles holds a privileged permission. Name and email are read-only once a user exists, for the same reason as personal info below.
- There is deliberately no notifications area or contact-details form: nothing in the backend backs them, and a person's name and email are delegated to Keycloak (see below). To add notifications later, put the bell in the navbar of `AppShell`, beside `UserMenu`.
- `/login?logout` exists only because Keycloak returns there after sign-out (that address is registered with it). It sends the visitor to `/`, where the card says they have been signed out.

The app name, footer links and copyright holder are constants in `src/config.ts`. The footer links are `#` placeholders: a .gov.sg service must point the privacy and terms links at real pages.

## Project structure

`src/` follows a trimmed Feature-Sliced Design (see [ADR 0002](docs/adr/0002-frontend-folder-structure.md)):

- `app/` bootstrap and composition: `App`, route guard, layouts, the idle-timeout modal.
- `features/` one folder per feature (`account`, `admin`, `audit`, `home`, `login`, `review`, `settings`), each with its pages and API calls.
- `shared/` code that knows nothing about a feature: `session/` (signed-in user and session lifecycle), `lib/` (fetch, errors, CSRF), `ui/` (reusable components such as `DataTable` and `Footer`).

Imports only go downward (`app` → `features` → `shared`), and a feature never imports another feature. `npm run lint` enforces this. Use the `@/` alias for anything outside the current folder.

## Admin lists

The three lists page, sort and search on the server (see the backend's ADR 0027). Users also filter by status, access (privileged or not), role, email and created date, and show each user's last login and a status of active, pending (enabled but never signed in) or disabled. Below the `lg` breakpoint the tables become a list of cards and the admin sidebar becomes a drawer. Click a column to sort by it and shift-click others to add up to three sort columns. Role and permission pickers search as you type and show the first 20 matches.

A list's search, filters, sort, page size and page are kept in `sessionStorage`, so a hard refresh returns to the same view (see [ADR 0003](docs/adr/0003-persist-ui-state-in-session-storage.md)). They are forgotten on sign-out.

## Account review

`/admin/reviews` lists the review tasks (open, overdue or completed, with progress). `/admin/reviews/:taskId` is one review, in `src/features/review/`: an overview with a card for each of its three parts (both the privileged and the non-privileged review have the active accounts and the suspended and removed lists, each for the accounts of its own class), parts, the report links and numbered instructions, and a page under it for each part (`/active`, `/suspended`, `/removed`) with its own breadcrumb.

- _Active accounts_ is a table. Tick the accounts that are correct and press Confirm selected as reviewed (all or none). Edit Roles opens a dialog with the roles the account holds, to untick the ones to take away (a reviewer can only remove roles), and saves the roles kept, which also confirms the row. It needs `user:remove-role`, and Remove needs `user:remove`, besides `review:decide`. Remove asks for a reason and shows whose account it is. A row shows days since the last sign-in, counted to now while it waits and to the decision once reviewed (`inactivity.ts`); an account that never signed in shows no number, since the API does not say when it was created. Rows with `ownAccount` have their actions disabled.
- _Suspended accounts_ and _Removed accounts_ are read-only lists with one confirmation each: a sample check, since the reviewer only needs to look at a few records: either "I have reviewed a few records and the list looks complete and correct", or "I have concerns about this list" with required remarks. The remarks are the confirmation's note, which the report carries. The server does not treat the two differently, so neither blocks the review from completing, and nobody is notified. After confirming, the server keeps the list as it was and the page shows who confirmed it, with any remarks.
- There is no Complete button: the review completes by itself when the last required action happens, and from then on every page is read-only.

Reports are plain links to `GET /api/account-reviews/tasks/:id/report?format=pdf|xlsx|csv`. The server generates them (a completed task's PDF is the stored one) and answers with an attachment, so the page does no fetching or filenames of its own; while the task is open the links are labelled as drafts. Every download is recorded in the audit trail, so nothing prefetches them.

Two reviewers can work on the same task, so each page reads its data again when the window regains focus, and a refused batch (a `409` naming the items already decided) shows the server's message and refreshes the list. A row carries role names, and `currentRoles` carries their ids, so Edit Roles uses `currentRoles` (`{id, name}`, only on a pending row) and sends the ids to keep. There is no last-login filter, because the items list does not offer one; sort by last login instead.

## Branding

The name "MyService" and the logo are placeholders. To rebrand:

- Change `APP_NAME` in `src/config.ts`. It is the name shown beside the logo, on the sign-in card and in the footer, and it sets the browser tab title (`index.html` has the same name as a fallback for before scripts load).
- Change `--logo-primary` and `--logo-accent` in `src/index.css` to re-colour the logo mark. Where the mark sits on a dark panel they are set to white.
- Replace `public/favicon.svg`. It is the same mark with fixed colours, since a favicon cannot read the page's CSS variables.

The logo has no text in it: `BrandLogo` in `src/shared/ui/brand-logo/` writes the name as real text to the right of the mark, so it follows `APP_NAME`.

## Identity is delegated to Keycloak

A person's name and email are never editable anywhere in this app — not on `/account/personal-info`, and not from the admin console — because the backend's own terms call this "Delegated to Keycloak": a capability the application deliberately never implements, full stop. `GET /api/account` is read-only. If a deployment wants in-app profile editing, that is new backend work (forwarding to Keycloak's account REST API), not a gap in this frontend.

## Passkeys

`/account/signing-in` is a self-service passkey manager (list, rename, add, delete), backed by Spring Security's own WebAuthn endpoints and the backend's `/account/passkeys` (see docs/adr/0024 in the backend). The feature is off by default; the backend's `local` profile now enables it for `http://localhost:5173`. `src/features/account/webauthn.ts` hand-rolls the browser ceremony (`navigator.credentials.create`) and the base64url conversions it needs, since neither Spring Security nor this template bundles a client-side WebAuthn library.

Registering a passkey needs a recent sign-in, same as an admin write (see below) — the backend answers a stale session with the same `reauthentication-required` problem.

If `/api/account/passkeys` 404s, the page assumes the feature is disabled on that backend and says so, rather than showing an error.

## Re-authentication for sensitive writes

Every admin create/update/delete, and registering a passkey, needs a sign-in within a time window the backend configures; a stale one is answered with a `reauthentication-required` problem. `src/shared/lib/use-mutation.ts` is what every such form uses; on that problem it opens `ReauthModal` (`src/app/ReauthModal.tsx`), which says a recent sign-in is needed. For an OIDC session it saves the open form and goes to the `reauthentication_uri` from the problem; for a passkey session it confirms in place and the same change is sent again. A form that calls `useReauthResume` (`UserFormModal`, the add-passkey dialog) is restored when the browser comes back, and resubmitted if the same person signed in; any other form returns to the page with a note to repeat the change. See ADR 0007. The same `sessionStorage` mechanism (`src/shared/session/return-path.ts`) also sends an anonymous visitor back to the page they first asked for, once they log in: an SSO login leaves for Keycloak and returns to `/`, so `Login` remembers the page before leaving and `AuthGate` sends the visitor on from `/`.

Some admin actions are also rejected with a plain `access-denied` 403 by the backend's own business rules (for example, granting a role the signed-in administrator does not hold, or changing their own access) — this is expected, and the app shows the backend's message for it.

## Idle-timeout warning, synced across tabs

The backend ends an idle session after `server.servlet.session.timeout` (15 minutes by default; see its `application.yaml`/`commons-defaults.yaml`). `src/shared/session/session-timeout.ts`'s `SessionTimeoutMonitor` mirrors that as `SESSION_IDLE_TIMEOUT_MS` in `src/config.ts` — there is no backend endpoint that reports it, so this constant must be kept in sync by hand if a deployment changes the backend's value. `SESSION_PROMPT_BEFORE_MS` (60 seconds) is how long before the deadline `SessionTimeoutModal` asks whether to stay signed in.

It is decentralized on purpose: every open tab keeps its own countdown to the same deadline and a `BroadcastChannel` tells the others whenever it moves, rather than electing one tab to own a single canonical timer (which would need a failover case for when that tab closes). Moving your mouse or pressing a key counts as activity, the same as the backend's own idle timer would if the movement caused a request — but it is not sent to the server on every event; only at the moment a prompt would otherwise be shown does the monitor check for recent local activity, and if there is any, it silently re-fetches `/login-user` to reset the timer instead of interrupting anyone still visibly there. An ordinary API call from any tab (an admin table loading, a passkey being renamed, and so on) also counts as activity and quietly dismisses the prompt everywhere, exactly as it would reset the backend's own idle timer.

This deliberately never involves the backend's separate, non-extendable absolute session timeout — there is nothing to warn about early there, since activity can't push it out. Whenever any request does come back 401 for a real reason (the idle timeout despite the warning, the absolute timeout, an admin revoking the session, or a login superseding this one elsewhere — Spring Security allows only one session per user), `src/shared/session/session-broadcast.ts` tells every open tab, not just the one that saw the 401, and each shows the sign-in card in place with "You have been signed out.". `AuthProvider` is careful to only declare this for a tab that really was signed in before; a page that was never authenticated just shows its ordinary logged-out state, no message implied.

## Layout

Every signed-in page uses `AppShell` (`src/app/layouts/`): the masthead, a full-width top bar with the logo and the account menu (Personal info, Sign-in methods, Sign out), an optional left nav, the page, and a slim footer (the links on the left, the copyright on the right). `Layout` (the person's own pages) gives it no nav, so no sidebar or drawer button appears; hand it `navItems` when there are sections to show. `AdminLayout` gives it the admin nav and breadcrumbs. See [ADR 0006](docs/adr/0006-shared-app-shell-and-account-routes.md).

## Content Security Policy

The dev server sends a strict, nonce-based `Content-Security-Policy` (`vite-plugin-csp.ts`), so anything that needs inline script or `eval` fails during development, and reports Trusted Types violations without blocking. `dist/index.html` carries the placeholder `__CSP_NONCE__` on its script and style tags: whatever serves it must replace it with a fresh random nonce on every response and send the matching header. See [ADR 0005](docs/adr/0005-strict-content-security-policy.md).

## How login works

The backend is an OIDC client (Keycloak) that keeps a server-side session cookie, so the browser must see a single origin. `vite.config.ts` proxies two kinds of paths to the backend (`BACKEND_URL`, default `http://localhost:8081`):

- `/oauth2/*` and `/login/oauth2/*`, at their real backend paths. These can't move: Keycloak's registered redirect URI depends on Spring Security's fixed `{baseUrl}/login/oauth2/code/keycloak`.
- Everything else the frontend calls with `fetch`, under `/api/*`, with the prefix stripped before forwarding. Keeping these away from the app's own page paths means a page route (like `/admin/users`) can never collide with a backend path.

- On load the app calls `GET /api/login-user`: 200 means signed in, 401 means signed out.
- **Sign in** navigates to `/oauth2/authorization/keycloak`; Keycloak authenticates and returns through the proxy.
- **Sign out** sends `POST /api/logout` with `Accept: application/json` and the CSRF cookie (`__Host-XSRF-TOKEN` over TLS, else `XSRF-TOKEN`) echoed in the `X-XSRF-TOKEN` header. The backend answers `{"logoutUrl": ...}` and the app navigates there so Keycloak ends its own session too.
- Admin calls go to `/api/admin/*`, for example `GET /api/admin/users`.

## Running locally

1. Start Keycloak and the backend (`local` profile) per the backend repo's `bin/` scripts.
2. Run the backend's `bin/configure-keycloak.sh`. It registers this dev server (`FRONTEND_BASE_URL`, default `http://localhost:5173`) as an extra redirect, post-logout redirect and web origin on the `java-app-web-api-server` client. Keycloak matches these exactly, so the dev server uses port 5173 with `strictPort`.
3. The backend must honour `X-Forwarded-*` headers so its redirect URIs use `localhost:5173`.
4. `npm install && npm run dev`, then open http://localhost:5173.

Sign in with a development user from the backend's `bin/seed-test-data.js` (see the backend README).

## Scripts

`npm run dev`, `npm run build`, `npm test` (Vitest), `npm run lint` (oxlint), `npm run format` / `npm run format:check` (oxfmt), `npm run storybook` (component catalogue on port 6006, with an accessibility check per story), `npm run build-storybook`.

Stories sit next to the component as `*.stories.tsx`, currently for the reusable pieces in `src/shared/ui/`.
