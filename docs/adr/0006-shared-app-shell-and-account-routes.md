# ADR 0006: Shared app shell and account routes

## Status

Accepted

## Context

The person's own pages and the administration section each had their own layout. The account pages sat in a centred, narrow header with a footer and a small tab strip; administration had a full-width top bar, a left nav and breadcrumbs. The two top bars looked like different products. Neither the account menu nor the navigation was shared, and the account pages, which every signed-in person needs, could not be reached from inside administration.

The person's own area is expected to grow beyond two pages, and the reference starter-kit uses one shell (top bar, left nav, content) for every signed-in page, with the account actions in the avatar menu.

## Decision

- **One shell.** `AppShell` renders the masthead, a full-width top bar (logo, account menu), an optional left nav with a small-screen drawer, the page, and a slim footer with the links on the left and the copyright on the right. `Layout` (the person's own pages) and `AdminLayout` are thin wrappers that give it their differences: `AdminLayout` supplies the nav items and breadcrumbs, and `Layout` supplies none.
- **No nav, no sidebar.** With no `navItems` the shell renders no sidebar and no drawer button, and the page runs under the same top bar. The person's own area has no sections of its own yet, so it looks like that today. A sidebar appears when `Layout` passes items.
- **Account pages live in the account menu**, not in a nav: "Personal info", "Sign-in methods", a divider, then "Sign out". The tab strip and `AccountLayout` are removed.
- **Routes.** `/account/personal-info` and `/account/signing-in`, and the same two pages again under `/admin/account/…`, inside the existing administration guard, so an administrator stays in the admin shell. The menu builds its links from the current section's base path. `/account` has no page. `signing-in` is Keycloak's name for the section and the label ("Sign-in methods") is friendlier than the path.
- **Wording.** "Sign in" and "Sign out" throughout, not "log in" and "log out".

Alternatives considered: keeping two separate shells and only aligning the top bars (two nav systems to keep consistent, and it does not help when the person's own area grows); putting the account pages in a sidebar (they are one person's settings, not something used every day); redirecting `/account` to the profile (nothing links there any more, so it would only keep an address alive that nobody uses).

## Consequences

The top bar, account menu and help links are identical everywhere, and a new section for the person's own area is a matter of passing nav items. The two account pages are served at two addresses, once per section, and the administration section now links to them. That reverses the earlier assumption that the two sections would be separate apps. A deployment that does split them can drop the two `/admin/account/…` routes or point the menu at the other app's addresses.

There is one footer component, `Footer`: a slim strip with the links on the left and the copyright on the right. It shows `FOOTER_LINKS` and the copyright holder from `src/config.ts`, on the sign-in page too. It is a simplified take on the SGDS footer, with a flat list of links rather than grouped columns, a title or a dark tone.
