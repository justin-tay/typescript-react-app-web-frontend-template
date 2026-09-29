# ADR 0004: Show sign-in in place

## Status

Accepted

## Context

Every page needs a signed-in user. The usual way is a protected route that redirects an anonymous visitor to a `/login` page and back afterwards. That changes the address the person asked for, needs the asked-for page to be remembered and restored, and does not fit several open tabs: when the session ends, each tab either keeps showing pages whose requests now fail or is pushed to `/login?logout`.

The identity provider works by full-page redirects. An SSO login leaves for Keycloak and comes back to the one address Spring Security registered with it (`/`), and Keycloak's post-logout redirect is registered as `/login?logout`. Neither can be changed from the frontend.

## Decision

A single `AuthGate` wraps every route. Until someone is signed in it renders the sign-in card in place of whatever page was asked for, at that same address, instead of redirecting.

- While the session is being checked it shows a spinner. If the backend cannot be reached it shows the service-unavailable notice in the card.
- When a session ends, discovered by any request or announced by another tab, every tab shows the card where it is. There is no navigation, and saved table state is cleared. The card says "You have been logged out." when the person had been signed in.
- A passkey sign-in has no redirect, so the person stays on the same address. An SSO sign-in still leaves for Keycloak, so `Login` remembers the page asked for before leaving and `AuthGate` sends the visitor on to it when they arrive back at `/`.
- `/login?logout` remains only as a route that redirects to `/` with a "signed out" flag, because that address is registered with Keycloak. There is no login page of its own.
- Administration (`/admin`) is a further check, `RequireAdmin`, on the roles `login-user` reports. It does not depend on the gate.

Alternatives considered: redirecting to a `/login` page (the address changes, and the return path has to survive the redirect and the Keycloak round trip); a modal over the page for an expired session (the page underneath stays interactive and fails).

## Consequences

The address never changes for sign-in, a refresh or a deep link just works, and every tab reacts the same way with no `/login?logout` in the address bar. The return-path mechanism is still needed for the Keycloak round trip, but only there.

Anything a person had in progress on a page is replaced by the card when the session ends; it is not restored after signing in again. Pages behind the gate can rely on a signed-in user (`useCurrentUser`), so they no longer handle loading or anonymous states themselves.
