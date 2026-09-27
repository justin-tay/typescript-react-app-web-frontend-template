# Web frontend template

React + TypeScript + Vite frontend built with [OUI](https://oui.open.gov.sg) components. It demonstrates user login against `java-app-web-api-server-template`.

## How login works

The backend is an OIDC client (Keycloak) that keeps a server-side session cookie, so the browser must see a single origin. `vite.config.ts` proxies `/login-user`, `/oauth2`, `/login/oauth2` and `/logout` to the backend (`BACKEND_URL`, default `http://localhost:8081`).

- On load the app calls `GET /login-user`: 200 means logged in, 401 means logged out.
- **Log in** navigates to `/oauth2/authorization/keycloak`; Keycloak authenticates and returns through the proxy.
- **Log out** sends `POST /logout` with the `XSRF-TOKEN` cookie echoed in the `X-XSRF-TOKEN` header.

## Running locally

1. Start Keycloak and the backend (`local` profile) per the backend repo's `bin/` scripts.
2. Run the backend's `bin/configure-keycloak.sh`. It registers this dev server (`FRONTEND_BASE_URL`, default `http://localhost:5173`) as an extra redirect, post-logout redirect and web origin on the `java-app-web-api-server` client.
3. The backend must honour `X-Forwarded-*` headers so its redirect URIs use `localhost:5173`.
4. `npm install && npm run dev`, then open http://localhost:5173.

## Scripts

`npm run dev`, `npm run build`, `npm test` (Vitest), `npm run lint` (oxlint).
