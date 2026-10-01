# 8.4 Development Concepts

<!-- arc42-generated -->

## Build and Deployment Pipeline

| Script                                         | Purpose                                                                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                  | Vite dev server on port 5173 (`strictPort`), proxying `/api/*` and the OAuth paths to `BACKEND_URL` (default `http://localhost:8081`), with the CSP nonce middleware. |
| `npm run build`                                | `tsc -b` then `vite build`; output in `dist/` with the `__CSP_NONCE__` placeholder.                                                                                   |
| `npm test`                                     | `vitest run`.                                                                                                                                                         |
| `npm run lint`, `npm run format:check`         | `oxlint` and `oxfmt --check`.                                                                                                                                         |
| `npm run storybook`, `npm run build-storybook` | Component catalogue on port 6006 with an accessibility check per story.                                                                                               |

No CI configuration, container image or deployment manifest is in this repository (see section 11).

## Testing Strategy

| Level                 | What                                                                         | Where                                                    |
| --------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| Unit                  | Hooks, pure helpers, small components                                        | Next to the code, `*.test.ts(x)`                         |
| Component             | Shared UI such as `DataTable`, `PageHeader`, `FilterSelect`, `ErrorBoundary` | `src/shared/ui/*/`                                       |
| App-level integration | Whole routes against a stubbed `fetch` that answers by path                  | `src/app/App.test.tsx`, `src/app/AccountReview.test.tsx` |
| Architecture          | Every feature has a lint boundary override naming all other features         | `src/app/lint-boundaries.test.ts`                        |
| Visual, accessibility | Storybook stories with the a11y addon                                        | `*.stories.tsx`                                          |

There are no end-to-end tests against a real backend. Layout is not covered by jsdom; it is checked by hand in a browser.

## Coding Standards

- TypeScript `strict`; no `any` except one documented case in `data-table-core.ts`.
- `oxfmt` (single quotes, no semicolons, 120 columns, LF) and `oxlint`; the React hooks rules are on, and suppressions carry a comment saying why.
- `@/` for imports across folders, relative inside one.
- Components are function components; shared UI has an `index.ts` and a story.
- Comments explain why, not what; user-facing wording uses "sign in" and "sign out".

<!-- /arc42-generated -->
