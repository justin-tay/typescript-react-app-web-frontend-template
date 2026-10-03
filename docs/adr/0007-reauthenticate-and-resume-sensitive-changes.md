# ADR 0007: Reauthenticate and resume sensitive changes

## Status

Accepted

## Context

The backend refuses some writes when the login is older than a window (administration changes, review decisions, registering a passkey) with a `401` whose problem type is `reauthentication-required`. The problem body carries `max_age` (seconds), `method` (`oidc` or `passkey`) and, for OIDC only, `reauthentication_uri`. The window is measured from login, not from activity, and the backend does not check that the same method or the same person signs in again (see the backend's ADR 0023).

Until now the frontend answered that `401` by navigating to Keycloak at once. The person got no explanation, lost whatever they had typed, and came back to a page with nothing to say the change had not happened.

Signing in at Keycloak is a full-page navigation, so nothing in memory survives it. A passkey sign-in has no navigation.

## Decision

A sensitive change that is refused is handled in three parts.

1. **Say why, then do it.** `useMutation` passes the error to `requestReauthentication` (`shared/session/reauth.ts`), and `ReauthModal` (mounted once in `App`) opens: "Confirm it's you. Changes like this need you to have signed in within the last N minutes." N is `max_age` rounded up to whole minutes; nothing is hardcoded.
   - `method: oidc`: **Sign in again** saves the open form (below), remembers the page, and navigates to the `reauthentication_uri` the backend gave. The URI is never built by the frontend, and is dropped unless it is a path on this origin.
   - `method: passkey`: **Use passkey** runs the WebAuthn login in place. There is no navigation, so `useMutation` simply sends the same change again and the form sees the real result.
   - no `method` (any other kind of session), or an OIDC session with no usable URI: the dialog says to sign out and sign in again, with a **Sign out** button.
   - **Cancel** leaves the form as it is and saves nothing.
2. **Keep the form across the redirect.** A form that makes sensitive changes calls `useReauthResume(key, { getDraft, onResume })`. While it is on screen the dialog asks it for a draft, which goes to `sessionStorage` with the signed-in user's `id` (`reauth-stash.ts`): one slot, dropped after ten minutes, cleared on read. A form that did not register leaves an empty marker instead.
3. **Resume only for the same person.** After the redirect `AuthGate` returns the person to the page. The form finds its draft, and if `/login-user` returns the same `id` it reopens with the draft and submits it through its normal path, so errors appear in the form as they always do. A different `id` discards the draft and says so. The marker for an unregistered form shows "You're signed in again. Please repeat your change." (`ReauthReturnNotice`).

A form can instead choose not to submit on its own. Registering a passkey is one: the browser needs a fresh gesture to create it, so the form reopens with the name typed and says "Continue adding your passkey."

Messages never claim a result the app does not know. While resuming the form says "Submitting your change…"; if the change is refused again it says "your change couldn't be saved" and shows the errors; on success the form closes through its own handler.

Alternatives considered:

- **Replay the raw request after the redirect.** It needs no per-form work, but a failure on replay has no form to show field errors in, it bypasses each form's own success handling (refreshing a list, closing the dialog), and the request body would sit in storage. Restoring the form reuses the code that already handles every outcome.
- **A step-up (`acr`/`amr`) check.** The backend checks recency only, so the frontend does too.
- **Require every form to register.** Guarded forms are few; unregistered ones fall back to returning to the page with a notice, so they can adopt it one at a time.

## Consequences

Each form with sensitive changes adds one hook and a `notice` line. Today `UserFormModal` (create and edit) and the add-passkey dialog have adopted it; the other administration forms still return to the page with the "please repeat your change" notice.

The draft holds what the person typed (names, email addresses, group choices), so it is kept for ten minutes at most, in one slot, per tab, and is dropped on first read or if it is for another person. It never holds secrets. A form must keep its draft small and plain: only JSON-serialisable values.

Only one reauthentication is open at a time. When more than one registered form is on screen, the most recently registered one is saved.
