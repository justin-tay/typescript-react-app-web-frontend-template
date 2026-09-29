# ADR 0002: Frontend folder structure

## Status

Accepted

## Context

`src/` mixed two organizing principles at the same depth. By type: `components/`, `ui/`, `pages/`, `lib/`. By domain: `account/`, `admin/`, `auth/`. Nothing said whether a widget belonged in `components/` or `ui/` (a session-timeout modal sat in one and a confirm modal in the other), and a feature's API calls lived apart from the pages that used them. Shared code also imported from domain folders (for example `lib/api-errors.ts` reached into `auth/`), so the dependency direction was undefined.

This is a generic starter that others copy and trim, so it needs a layout that is easy to explain, keeps a feature's code together, and makes it safe to delete a feature.

## Decision

`src/` follows a trimmed [Feature-Sliced Design](https://feature-sliced.design/): three layers, with imports allowed only downward.

```
src/
  main.tsx, config.ts, index.css, test-setup.ts
  app/        bootstrap and composition: App, router provider, route guard, layouts
  features/   one folder per feature, each with its pages, API calls and helpers
    account/  admin/  home/  login/
  shared/     code with no knowledge of any feature
    session/  the signed-in user and session lifecycle (context, idle timeout, return path, re-auth)
    lib/      fetch wrapper, error mapping, CSRF, mutation hook, WebAuthn codec
    ui/       reusable components, one folder each (data-table, footer, confirm-modal)
```

Rules:

- `app` may import from `features` and `shared`; `features` may import from `shared`; `shared` imports from neither.
- A feature must not import from another feature or from `app`.
- `config.ts` is a leaf module that any layer may import. A `shared` component must still take app-specific values as props (as `Footer` does) so it can be reused.
- Cross-folder imports use the `@/` alias for `src/`; imports inside one folder stay relative.
- The rules are enforced by `no-restricted-imports` overrides in `.oxlintrc.json`, not only documented.

Pages live inside their feature, not in a top-level `pages/` folder, so a feature's screens, API calls and helpers can be read or removed together. Layouts, `AuthGate`, `RequireAdmin`, `UserMenu` and `SessionTimeoutModal` are in `app/` because they need the signed-in user and compose features.

Components OUI does not provide (`DataTable`, `Footer`) go in `shared/ui/<kebab-case-name>/` with an `index.ts`. OUI's own components are imported directly from `@opengovsg/oui`, not wrapped.

Alternatives considered:

- bulletproof-react's flat top-level folders (`components`, `hooks`, `lib`, `utils`) with routes in `app/routes`. Equally valid, but enforcing the dependency rule then takes a rule per folder, and pages are separated from their feature.
- Full Feature-Sliced Design (`pages`, `widgets`, `entities` as separate layers). More folders than a template of this size needs; it is the natural upgrade path if the app grows.
- OpenGov's starter-kit layout is a Next.js/tRPC monorepo organized by package and technical layer, so it does not transfer.

## Consequences

- `shared/session` holds the signed-in user and session lifecycle even though it has some domain meaning, because both `shared/lib` and every feature depend on it. Moving it to `features` would force every feature to import another feature.
- The lint rules list each feature by name, so adding a feature means adding an override. This is deliberate friction, and the boundary is checked by lint, not by review.
- If features or widgets are later reused across several pages, `widgets` and `entities` layers can be added above `shared` without changing the rules.
- Moving files kept history because they were renamed with `git mv`; only import paths changed.
