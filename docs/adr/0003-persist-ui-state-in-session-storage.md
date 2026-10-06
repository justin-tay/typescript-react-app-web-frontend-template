# ADR 0003: Persist UI state in sessionStorage

## Status

Accepted

## Context

This is a single-page application. A hard refresh reloads every script and throws away in-memory React state, so an administrator who has searched, filtered, sorted and paged a list would land on an unfiltered first page. The expectation is that a refresh returns to exactly the same view.

Two places could hold that state across a refresh. The URL query string also makes a view shareable and works with the back button, but it puts search text (often a person's name or email) into browser history and server logs, and it makes every keystroke-driven change a navigation. `localStorage` outlives the tab and the sign-in, which is wrong for state that describes what one person was looking at.

## Decision

State that describes a view, such as a table's search text, filters, sort order, page size and current page, is kept in `sessionStorage`, restored in full on load, and not put in the URL.

- One key per view, namespaced `table-state:<name>` (for example `table-state:users`). `usePagedList` in `src/shared/lib/use-paged-list.ts` does this, reading and writing through `src/shared/lib/table-state-storage.ts` when given a `storageKey`.
- What is read back is validated. Corrupt or unexpected data is ignored and the view starts from its defaults.
- Every read and write is wrapped in `try`/`catch`. If storage is unavailable or full, the view still works and simply does not survive a refresh.
- Saved state is forgotten when the session ends: `endSession()` in `src/shared/session/session-end.ts` is the single place that calls `clearPersistedTableState()`, so no way of ending a session can forget it. It runs when the person signs out, when the session times out or is revoked, and in every other open tab (storage is per tab, so each tab clears its own). It is also cleared when the app starts and finds nobody signed in, so a session that ended while a tab was idle or closed does not leave the last person's searches for the next person to sign in on that tab.
- Only the identifier of a chosen related record is stored (for example a group's id). Its display name is fetched again after a refresh.

Views that need shareable links can still use the URL for that specific case; this decision is about the default.

## Consequences

A refresh restores the same view without any per-page work beyond passing a key. State does not leak into history, logs or shared links, and it goes when the tab closes or the person signs out.

Two tabs on the same list have independent state. A restored group filter costs one extra request to fetch the group's name. Because search text can identify a person, the sign-out clearing is part of the behaviour and is covered by tests, not an optional extra. New views that keep state this way must use the `table-state:` prefix so it is cleared with the rest.
