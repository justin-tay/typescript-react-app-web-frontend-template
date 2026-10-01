# 2. Architecture Constraints

<!-- arc42: Any requirement that constrains software architects in their freedom
of design and implementation decisions or decision about the development process. -->

## Technical Constraints

<!-- arc42-generated -->

| Constraint                     | Description                                                                                                                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single origin                  | The backend authenticates with a server-side session cookie, so the browser must see one origin. `vite.config.ts` proxies the OAuth flow paths (`/oauth2`, `/login/oauth2`) at their real paths and everything else the app calls under `/api/*`, with the prefix stripped. |
| Fixed Keycloak redirect        | Keycloak matches redirect URIs exactly, and Spring Security's callback is the fixed `/login/oauth2/code/keycloak`. The dev server therefore uses port 5173 with `strictPort`.                                                                                               |
| No tokens in the browser       | The backend is the OIDC client and keeps the session. The frontend holds a cookie it cannot read (the session) and one it echoes (`XSRF-TOKEN` in an `X-XSRF-TOKEN` header).                                                                                                |
| CSRF header on writes          | Every non-GET request must echo the CSRF cookie in a header, matching Spring Security's default filter.                                                                                                                                                                     |
| Strict Content Security Policy | Pages run under a nonce-based policy with no `'unsafe-inline'`. Anything needing inline script, inline style or `eval` will not run. See ADR 0005.                                                                                                                          |
| Idle timeout mirrored by hand  | `SESSION_IDLE_TIMEOUT_MS` in `src/config.ts` must equal the backend's `server.servlet.session.timeout`. Nothing enforces it.                                                                                                                                                |
| OUI design system              | UI is built on `@opengovsg/oui` (React Aria Components, Tailwind CSS 4). OUI components are used directly, not wrapped.                                                                                                                                                     |
| Browser APIs                   | Passkeys need `PublicKeyCredential`; cross-tab messaging needs `BroadcastChannel`.                                                                                                                                                                                          |
| TypeScript settings            | `strict`, `erasableSyntaxOnly`, ES2023 target, bundler module resolution.                                                                                                                                                                                                   |

<!-- /arc42-generated -->

## Organizational Constraints

<!-- arc42-manual: Document organizational constraints such as schedule, budget, team structure, process model -->

| Constraint | Description |
| ---------- | ----------- |
|            |             |

<!-- /arc42-manual -->

## Development Conventions

<!-- arc42-generated -->

| Convention | Description                                                                                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layering   | `src/` has three layers, `app` → `features` → `shared`, imports only downward; a feature never imports another feature or `app`. Enforced by `no-restricted-imports` overrides in `.oxlintrc.json` and by `src/app/lint-boundaries.test.ts`. See ADR 0002. |
| Imports    | `@/` aliases `src/`; imports inside one folder stay relative.                                                                                                                                                                                              |
| Formatting | `oxfmt`: single quotes, no semicolons, 120-column lines, LF line endings.                                                                                                                                                                                  |
| Linting    | `oxlint` with the React hooks rules and the boundary rules.                                                                                                                                                                                                |
| Tests      | Vitest with Testing Library in jsdom, next to the code (`*.test.ts(x)`), plus two app-level integration files.                                                                                                                                             |
| Components | Reusable pieces live in `src/shared/ui/<kebab-case-name>/` with an `index.ts`, and get a Storybook story.                                                                                                                                                  |
| Decisions  | Recorded as ADRs in `docs/adr/`.                                                                                                                                                                                                                           |
| Commits    | A single short subject line, no body.                                                                                                                                                                                                                      |

<!-- /arc42-generated -->
