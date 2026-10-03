# 9. Architecture Decisions

<!-- arc42: Important, expensive, large scale or risky architecture decisions
including rationals. With "architecture decisions" we mean those decisions
that affect the structure, non-functional characteristics, dependencies,
interfaces, or construction techniques. -->

Decisions are kept as ADRs in [`docs/adr/`](../adr/), one file each, using the template in ADR 0001. This section indexes them.

## ADR Format

Each decision follows this structure:

### ADR-NNN: [Decision Title]

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
- **Context:** What is the issue that motivates this decision?
- **Decision:** What is the change being proposed or decided?
- **Consequences:** What becomes easier or harder because of this change?

---

<!-- arc42-generated -->

| ADR                                                                | Title                                       | Status   | Summary                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [0001](../adr/0001-adr-template.md)                                | ADR template                                | Accepted | The format used by the others.                                                                                                                   |
| [0002](../adr/0002-frontend-folder-structure.md)                   | Frontend folder structure                   | Accepted | Three layers (`app`, `features`, `shared`) with imports only downward; a feature never imports another; boundaries enforced by lint.             |
| [0003](../adr/0003-persist-ui-state-in-session-storage.md)         | Persist UI state in sessionStorage          | Accepted | List state (search, filters, sort, page) survives a hard refresh in `sessionStorage`, not in the URL; cleared when the session ends.             |
| [0004](../adr/0004-show-sign-in-in-place.md)                       | Show sign-in in place                       | Accepted | One `AuthGate` shows the sign-in card at the requested address instead of redirecting to a login page; every tab shows it when the session ends. |
| [0005](../adr/0005-strict-content-security-policy.md)              | Strict Content Security Policy              | Accepted | Nonce-based CSP with no `'unsafe-inline'`, enforced in the dev server; production must replace the `__CSP_NONCE__` placeholder per response.     |
| [0006](../adr/0006-shared-app-shell-and-account-routes.md)         | Shared app shell and account routes         | Accepted | One `AppShell` for the person's pages and administration; account pages live in the account menu and are mounted in both sections.               |
| [0007](../adr/0007-reauthenticate-and-resume-sensitive-changes.md) | Reauthenticate and resume sensitive changes | Accepted | A dialog explains why, then signs in at Keycloak or with a passkey; a form that registers is restored and resubmitted for the same person.       |

<!-- /arc42-generated -->

<!-- arc42-manual: Add architecture decisions not documented elsewhere -->

Decisions taken in code but not yet written up as ADRs, worth recording:

- Administration navigation: OUI's `Sidebar` with icons and an Overview item; breadcrumb from `lg` up and a back link below it, never both.
- Tables become cards below `lg`, with row selection on the cards.
- Small hooks (`useResource`, `usePagedList`) instead of a query library, partly because background refetching would defeat the idle timeout.
- Tab title as a React 19 `<title>` element placed ahead of the static one in `index.html`.

<!-- /arc42-manual -->
