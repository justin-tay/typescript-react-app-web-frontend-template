# Web frontend template

React + TypeScript + Vite frontend built with [OUI](https://oui.open.gov.sg) components. It demonstrates user login against `java-app-web-api-server-template`.

## Pages

- `/` public landing page.
- `/login` login card. Keycloak returns here (`/login?logout`) after logout.
- `/profile` the signed-in user's details; a logged-out visitor is sent to `/login`.
- `/users` the admin users table; requires the backend's `USER_MANAGE` authority, and shows a warning otherwise.

The app name, footer links and copyright holder are constants in `src/config.ts`. The footer links are `#` placeholders: a .gov.sg service must point the privacy and terms links at real pages.

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
