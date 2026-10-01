# 4. Solution Strategy

<!-- arc42: A short summary and explanation of the fundamental decisions and
solution strategies that shape the system's architecture. -->

## Technology Decisions

<!-- arc42-generated -->

| Decision Area  | Choice                                                                                                                            | Rationale                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Language       | TypeScript 6 (`strict`)                                                                                                           | Types across the API boundary and the UI; checked in the build (`tsc -b`).                                                                                   |
| UI framework   | React 19 with React Router 8                                                                                                      | Single-page application with client-side routing; `BrowserRouter` plus a bridge (`AriaRouterProvider`) so React Aria links navigate client-side.             |
| Design system  | OUI (`@opengovsg/oui`), React Aria Components, Tailwind CSS 4, `lucide-react` icons                                               | Government-style components with accessibility built in; used directly, not wrapped. Missing pieces (`DataTable`, `Footer`, `Card`) live in `src/shared/ui`. |
| Tables         | TanStack Table 9, server-driven paging, sorting and filtering                                                                     | The backend pages every list; `DataTable` only renders and forwards requests.                                                                                |
| Build          | Vite 8 with a small CSP plugin (`vite-plugin-csp.ts`)                                                                             | Fast dev server, same-origin proxy to the backend, nonce placeholder in the built page.                                                                      |
| Authentication | The backend is an OIDC client (Keycloak) with a server-side session cookie; passkeys through Spring Security's WebAuthn endpoints | No tokens or secrets in the browser (section 8, security).                                                                                                   |
| Authorization  | Roles from `GET /api/login-user` gate navigation and controls; the backend enforces                                               | The frontend only avoids offering what would be refused.                                                                                                     |
| Server data    | Small hooks (`usePagedList`, `useResource`, `useMutation`) over `fetch`                                                           | The app has a handful of independent reads; a query cache would also fight the session idle timer by making background requests that count as activity.      |
| View state     | React state, with list state persisted in `sessionStorage` (ADR 0003)                                                             | A hard refresh restores the same list view without putting search text in the URL.                                                                           |
| Testing        | Vitest 5, Testing Library, jsdom; Storybook 10 for shared components                                                              | Tests next to code; an accessibility check per story.                                                                                                        |
| Tooling        | oxlint, oxfmt                                                                                                                     | Fast lint and format, with boundary rules checked in CI-style runs.                                                                                          |

<!-- /arc42-generated -->

## Quality Goal Strategies

<!-- arc42: How the fundamental architecture approaches address the top quality goals -->

<!-- arc42-generated -->

| Quality Goal                                    | Approach                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security of the browser side of the session     | Nonce-based CSP enforced in development (ADR 0005); CSRF header on every write; no tokens stored in the browser; saved list state cleared when the session ends in any tab; re-authentication for sensitive writes; no HTML injection APIs. |
| Maintainability as a copyable template          | Three-layer folder structure with lint-enforced boundaries (ADR 0002); a test that fails when a feature has no boundary rule; ADRs for decisions; shared hooks for repeated patterns.                                                       |
| Accessibility and usability on all screen sizes | OUI and React Aria for keyboard and screen-reader behaviour; a modal navigation drawer below `lg`; tables become cards below `lg`; focus moves to the page heading on navigation; landmarks are named; load failures are announced.         |
| Resilience to a failing backend                 | One error mapping (`failureKind`) separates "unavailable" from "failed"; every page that loads data has a retry; an error boundary around page content keeps the navigation usable.                                                         |

<!-- /arc42-generated -->

## Organizational Decisions

<!-- arc42-manual: Development process, delegation, third-party decisions -->
<!-- /arc42-manual -->
