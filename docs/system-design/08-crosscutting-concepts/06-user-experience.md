# 8.6 User Experience

<!-- arc42-generated -->

## Layout and responsiveness

- One shell for every signed-in page: masthead, top bar (logo, account menu), optional left navigation, content, slim footer (ADR 0006).
- Below the `lg` breakpoint (1024px) the sidebar becomes a modal drawer, tables become lists of cards, and the breadcrumb gives way to a "Back to ..." link on detail pages. One of the two is on screen at any size, never both.
- Between `lg` and about 1160px the Users table is wider than its column and scrolls horizontally inside its box. This is accepted.

## Navigation

- Administration sidebar: Overview, Users, Groups, Account reviews (with an open or overdue count), Audit trail, Settings, each with an icon; items appear only for roles the person holds.
- The breadcrumb root is the section, "Administration". There is no breadcrumb on the Overview.
- The tab title is the page's heading plus the app name. After navigating, focus moves to the page heading (or the content area while it loads).
- A skip link jumps to the main content; the top bar and the sidebar are separately named navigation landmarks.

## Forms and lists

- List state (search, filters, sort, page) survives a refresh and is forgotten when the session ends (ADR 0003).
- Filter rows share one control height so labels and boxes align; dropdowns are styled like text fields.
- Destructive or irreversible actions ask first, in a dialog that says what will happen; removing and suspending ask for a reason code. A dialog's last error is cleared when it closes.
- On small screens each card has its own checkbox, and the list has a "select all on this page".

## Feedback and errors

- Loading is a spinner or table skeleton. A failed load shows a notice announced to screen readers, with "Try again" and, for lists, "Clear search and filters".
- A page that fails while rendering is replaced by the same notice, inside the shell so the navigation stays usable.
- The session warning is a modal with a countdown and a "Stay signed in" button.

## Accessibility

Built on React Aria Components through OUI. The navigation drawer traps focus, closes on Escape and returns focus to its button. Interactive cards and links have at least a 44px touch area where they sit alone. Storybook runs an accessibility check on every story.
<!-- /arc42-generated -->

<!-- arc42-manual: Add UX guidelines, content style and any accessibility conformance target -->
<!-- /arc42-manual -->
