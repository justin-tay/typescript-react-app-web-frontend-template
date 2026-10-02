# 6. Runtime View

<!-- arc42: Behavior of building blocks as scenarios, covering important use
cases or features, interactions at critical external interfaces, operation
and administration, error and exception scenarios. -->

Only architecturally relevant scenarios are shown: the flows that cross the browser, the backend and Keycloak, or that coordinate several tabs. Each is described from the code as it is. Participant names match the building blocks in [section 5](05-building-block-view.md).

| #   | Scenario                                   | Why it matters                                                                                       |
| --- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 1   | Sign in with single sign-on                | A full-page round trip through Keycloak that must bring the person back to the page they asked for.  |
| 2   | Sign in with a passkey                     | A browser ceremony with a retry when the old session has died.                                       |
| 3   | Idle warning and keeping the session alive | Three tabs, one deadline, and a timer that must not be defeated by background requests.              |
| 4   | The session ends                           | One tab finds out; every tab must show the sign-in card and forget saved state.                      |
| 5   | Sign out                                   | Two sessions to end (application and Keycloak) and the other tabs to tell.                           |
| 6   | Re-authentication for a sensitive write    | A write refused for an old login, a detour through Keycloak, and returning to the page.              |
| 7   | Deciding on review items in bulk           | The longest write flow: selection, confirmation, all-or-nothing request, and refreshing three views. |
| 8   | A list loads, with restored state          | Where saved list state is read and where a failure is handled.                                       |
| 9   | The backend cannot be reached              | Failure at start-up, before anyone is known to be signed in.                                         |
| 10  | A page fails while rendering               | An exception in the UI must not leave a blank screen.                                                |

## Scenario 1: Sign in with single sign-on

<!-- arc42-generated -->

**Overview:** an anonymous visitor asks for any address. `AuthGate` shows the sign-in card at that address. SSO leaves the application for Keycloak and returns to the one address Keycloak has registered, `/`, so the requested page is remembered before leaving (ADR 0004).

```mermaid
sequenceDiagram
    actor P as Person
    participant G as AuthGate and Login
    participant S as sessionStorage
    participant B as Backend
    participant K as Keycloak

    P->>G: opens /admin/users
    G->>B: GET /api/login-user
    B-->>G: 401
    G-->>P: sign-in card, address unchanged
    P->>G: Sign in with SSO
    G->>S: save auth.returnPath = /admin/users
    G->>B: navigate to /oauth2/authorization/keycloak
    B->>K: redirect to authenticate
    K-->>B: authenticated, redirect back
    B-->>P: session cookie set, redirect to /
    P->>G: app loads at /
    G->>B: GET /api/login-user
    B-->>G: 200 user and authorities
    G->>S: read and clear auth.returnPath
    G-->>P: replace address with /admin/users
```

**Steps:**

1. The first `GET /api/login-user` returns `401`, so the sign-in card is shown where the person is.
2. `Login` saves the path (unless it is already `/`) and navigates the whole browser to the backend's OAuth path.
3. After Keycloak, the backend sets the session cookie and returns to `/`. The app starts again and loads the user.
4. `AuthGate` sees an authenticated user at `/`, consumes the saved path, and navigates there with `replace`.

**Notes:** if storage is unavailable the saved path is lost and the person lands on `/`. An abandoned sign-in leaves the saved path in that tab, so a later sign-in from `/` goes there.
<!-- /arc42-generated -->

## Scenario 2: Sign in with a passkey

<!-- arc42-generated -->

**Overview:** no redirect: the person stays on the same address. If the browser still holds a dead session cookie, the backend answers the options request with a `401` and a fresh session, and the ceremony is retried once.

```mermaid
sequenceDiagram
    actor P as Person
    participant L as Login (webauthn-login)
    participant A as Authenticator
    participant B as Backend
    participant G as AuthProvider

    P->>L: Sign in with a passkey
    L->>B: POST /api/webauthn/authenticate/options
    B-->>L: options (one retry if 401, new CSRF cookie)
    L->>A: navigator.credentials.get
    A-->>L: signed assertion
    L->>B: POST /api/login/webauthn with CSRF header
    alt 401 problem "unauthenticated" (session died in between)
        L->>B: whole ceremony once more
    else other failure
        L-->>P: "That passkey was not recognized."
    end
    B-->>L: 200, new session cookie
    L->>G: reload()
    G->>B: GET /api/login-user
    G-->>P: signed in, same address
```

**Notes:** only the `urn:problem:unauthenticated` `401` triggers the retry. A rejected assertion returns an empty `401` and is not retried, since asking again would prompt for a passkey that will not work.
<!-- /arc42-generated -->

## Scenario 3: Idle warning and keeping the session alive

<!-- arc42-generated -->

**Overview:** the backend ends an idle session after a configured time, mirrored in `SESSION_IDLE_TIMEOUT_MS` (15 minutes). Every tab runs its own `SessionTimeoutMonitor` against the same deadline, which is a little earlier than the backend's (`SESSION_EXPIRY_MARGIN_MS`, see the notes), and tells the others when the deadline moves or the person is active.

```mermaid
sequenceDiagram
    participant T1 as Tab 1 (monitor)
    participant T2 as Tab 2 (monitor)
    participant B as Backend
    participant K as Keycloak

    Note over T1,T2: deadline = last server activity + 15 min - margin
    T1->>B: any successful API call
    T1->>T1: noteServerActivity, reset timers
    T1-->>T2: BroadcastChannel: activity at t
    T2->>T2: deadline moves, hide any prompt
    T1-->>T2: BroadcastChannel: user active (throttled)
    Note over T1,T2: 60 s before the deadline, the prompt timer fires in every tab
    alt mouse or key activity in any tab in the last 30 s
        T1->>T1: takes the heartbeat lock (Web Locks, ifAvailable)
        T2->>T2: lock is taken, skips and waits for the broadcast
        T1->>B: GET /api/login-user (silent extension)
        B-->>T1: 200, idle timer reset
        T1-->>T2: BroadcastChannel: activity
    else nobody active
        T1->>T1: show "You'll be signed out soon" with countdown
        T2->>T2: show the same prompt
        alt person presses Stay signed in
            T1->>B: GET /api/login-user
            B-->>T1: 200
            T1-->>T2: BroadcastChannel: activity, prompt hides
        else person presses Sign out now
            T1->>B: POST /api/logout (as the user menu does)
            B-->>T1: 200 {"logoutUrl"}
            T1-->>T2: BroadcastChannel: signed-out
            T1->>K: browser follows logoutUrl, Keycloak session ends
        else countdown reaches zero (before the backend's deadline)
            T1-->>T2: BroadcastChannel: expired
            T1->>B: POST /api/logout
            B-->>T1: 200 {"logoutUrl"}
            T1->>K: browser follows logoutUrl, Keycloak session ends
            K-->>T1: redirect to the sign-in card, marked "session expired"
        end
    end
```

**Notes:** the prompt is shown only when nobody has recently used the mouse or keyboard in any tab. When several tabs would extend at once, one takes a browser-wide lock and makes the request; the others skip it, and prompt anyway if its result does not arrive within a few seconds.

**Why the frontend ends the session before the backend does.** Keycloak's session is ended only when the browser visits the `logoutUrl` that `POST /api/logout` returns, and the backend builds that URL (with the `id_token_hint`) from the signed-in user's ID token, which only exists while the backend session is alive. If the frontend waited for the backend's own expiry, there would be no session left to ask, no `id_token_hint`, and Keycloak's session would live on (ADR 0025 in the backend repository). So the countdown ends `SESSION_EXPIRY_MARGIN_MS` early, which must exceed network latency, since the frontend starts counting when a response arrives and the backend when it handled the request.

Reaching zero never asks the server whether the session is still alive: any authenticated request counts as activity and could extend a session nobody chose to keep. If `POST /api/logout` fails anyway (for example the session is already gone), the sign-in card is shown in place and Keycloak is not told, so Keycloak's SSO idle timeout should not exceed the backend's. The backend's non-extendable absolute timeout is discovered by the next request that fails (see scenario 4). **Every successful API call counts as activity**, as it does on the backend, so any background polling would keep the session alive for ever; none exists, and none should be added without a way to mark it as background.
<!-- /arc42-generated -->

## Scenario 4: The session ends

<!-- arc42-generated -->

**Overview:** the session can end for reasons the browser did not cause: idle or absolute timeout, an administrator revoking it, or a newer login elsewhere. The first request that returns `401` finds out. Every tab then shows the sign-in card where it is, and nothing is left looking at pages that no longer work.

```mermaid
sequenceDiagram
    actor P as Person
    participant T1 as Tab 1
    participant B as Backend
    participant C as BroadcastChannel app:session
    participant T2 as Tab 2

    P->>T1: presses Next page on a list
    T1->>B: GET /api/admin/users?page=1
    B-->>T1: 401 (problem, not "reauthentication-required")
    T1->>T1: declareSignedOut()
    T1->>T1: clear saved list state
    T1->>C: post expired
    T1->>T1: mark expired, show sign-in card in place
    C-->>T2: expired
    T2->>T2: clear its saved list state
    T2->>T2: show sign-in card in place
    T1-->>P: "You were signed out because your session expired."
```

**Notes:** saved list state (`table-state:*`) is per tab, so each tab clears its own. Search text can identify a person, which is why clearing is part of the behaviour and is tested. A `401` that is a `reauthentication-required` problem is not a session end (scenario 6).
<!-- /arc42-generated -->

## Scenario 5: Sign out

<!-- arc42-generated -->

**Overview:** signing out must end both the application's session and Keycloak's, and tell the other tabs, without them sitting on stale pages.

```mermaid
sequenceDiagram
    actor P as Person
    participant T1 as Tab 1 (AuthProvider)
    participant B as Backend
    participant K as Keycloak
    participant T2 as Tab 2

    P->>T1: Sign out in the account menu
    T1->>B: POST /api/logout (Accept json, CSRF header)
    B-->>T1: logoutUrl
    T1->>T1: clear expired flag, clear saved list state
    T1-->>T2: BroadcastChannel: signed-out
    T2->>T2: show sign-in card ("You have been signed out.")
    T1->>K: navigate to logoutUrl
    K-->>T1: redirect to /login?logout
    T1->>T1: LoggedOutReturn: navigate to / with a signed-out flag
    T1-->>P: sign-in card, "You have been signed out."
```

**Notes:** `/login?logout` exists only because that address is registered with Keycloak; it immediately redirects to `/`. If `POST /api/logout` fails, the app shows the error state in the card and the session is unchanged.
<!-- /arc42-generated -->

## Scenario 6: Re-authentication for a sensitive write

<!-- arc42-generated -->

**Overview:** administration writes and registering a passkey need a recent sign-in. A stale one is refused with a problem of type `reauthentication-required`, and `useMutation` sends the person through Keycloak again with `max_age=0`.

```mermaid
sequenceDiagram
    actor P as Person
    participant F as Form (useMutation)
    participant S as sessionStorage
    participant B as Backend
    participant K as Keycloak

    P->>F: Save
    F->>B: PUT /api/admin/groups/g1 with CSRF header
    B-->>F: 401 problem reauthentication-required
    F->>S: save return path (current page)
    F->>B: navigate to /oauth2/authorization/keycloak?max_age=0
    B->>K: force a fresh authentication
    K-->>P: sign in again
    K-->>B: authenticated
    B-->>P: redirect to /
    P->>F: AuthGate navigates to the saved page
    Note over P,F: the form is closed and its input is lost
```

**Notes:** the page is restored, not the form: anything typed is lost, and the person repeats the change. This is deliberate and documented in the README.
<!-- /arc42-generated -->

## Scenario 7: Deciding on review items in bulk

<!-- arc42-generated -->

**Overview:** a reviewer ticks accounts and verifies or removes them. The request is all-or-none, so one blocked item refuses the lot and the server's message names it. Success refreshes three things: the list, the task's counts, and the sidebar badge.

```mermaid
sequenceDiagram
    actor R as Reviewer
    participant T as ReviewItemsTable
    participant B as Backend
    participant K as ReviewTask
    participant S as useTaskSummary (sidebar badge)

    R->>T: ticks rows (only others' pending accounts are selectable)
    R->>T: Verify selected (N), or Remove with a reason
    T-->>R: confirmation dialog
    R->>T: Confirm
    T->>B: POST /api/account-reviews/tasks/{id}/decisions
    alt 409 or 403
        B-->>T: problem with a message naming the items
        T-->>R: message in the dialog, dialog stays open
    else accepted
        B-->>T: success
        T->>T: close dialog, clear selection, reload list
        T->>K: onChanged: reload the task (counts)
        T->>S: window event: refetch summary
        S->>B: GET /api/tasks/summary
        S-->>R: badge updates
    end
```

**Notes:** the selection survives paging and sorting but is cleared when the search or a filter changes, since a permanent removal must never act on rows that are out of view. A dialog's last error is cleared when it closes.
<!-- /arc42-generated -->

## Scenario 8: A list loads, with restored state

<!-- arc42-generated -->

**Overview:** every server-paged list reads its saved view from `sessionStorage` before the first request, so a hard refresh returns to the same page, search, filters and sort (ADR 0003).

```mermaid
sequenceDiagram
    actor P as Person
    participant L as List page (usePagedList)
    participant S as sessionStorage
    participant B as Backend

    P->>L: opens or refreshes /admin/users
    L->>S: read table-state:users, validate shape
    S-->>L: saved view, or defaults if missing or corrupt
    L->>B: GET /api/admin/users?page&size&sort&search&filters
    alt loaded
        B-->>L: page of items
        L-->>P: table or cards
        L->>S: save view on every change
    else failed
        B-->>L: error
        L-->>P: notice with Try again and Clear search and filters
        P->>L: Clear search and filters
        L->>S: save defaults
        L->>B: request again with defaults
    end
```

**Notes:** a response for a page past the end (after deleting the last row of the last page) moves to the last page that exists. Search and text filters are debounced so each keystroke is not a request. A `403` shows "You do not have permission to do this." as a warning with no retry, since trying again cannot help.
<!-- /arc42-generated -->

## Scenario 9: The backend cannot be reached

<!-- arc42-generated -->

**Overview:** at start-up nothing is yet known about the session. If `GET /api/login-user` cannot be completed, the app must not flash the sign-in form as if the person were signed out.

```mermaid
sequenceDiagram
    actor P as Person
    participant G as AuthProvider and AuthGate
    participant B as Backend

    P->>G: opens any address
    G->>B: GET /api/login-user
    B--xG: no response, or 502 / 503 / 504
    G->>G: failureKind = unavailable
    G-->>P: card with "Service unavailable" and Try again (announced as an alert)
    P->>G: Try again
    G->>B: GET /api/login-user
    B-->>G: 200 or 401
    G-->>P: signed in, or the normal sign-in card
```

**Notes:** a missing response (a rejected `fetch`) and the three gateway statuses are "unavailable"; anything else is "failed", with different wording. Raw error detail goes to the console, not the screen.
<!-- /arc42-generated -->

## Scenario 10: A page fails while rendering

<!-- arc42-generated -->

**Overview:** an exception thrown while rendering a page would otherwise unmount the whole tree and leave a blank screen. The error boundary sits inside the shell, around the page content only.

```mermaid
sequenceDiagram
    actor P as Person
    participant R as Page component
    participant E as ErrorBoundary (inside AppShell)
    participant N as Shell navigation

    P->>R: navigates to a page
    R--xE: throws while rendering
    E->>E: console.error with the component stack
    E-->>P: "Something went wrong" with Try again (announced)
    Note over N,P: top bar and sidebar still work
    alt person presses Try again
        E->>R: render again
    else person navigates elsewhere
        N->>E: path changes, boundary resets
        E->>R: render the new page
    end
```

**Notes:** only render-time errors are caught. Errors in event handlers and failed requests are handled where they happen (the mutation hook and each page's error state).
<!-- /arc42-generated -->

<!-- arc42-manual: Document further error and exception scenarios -->
<!-- /arc42-manual -->
