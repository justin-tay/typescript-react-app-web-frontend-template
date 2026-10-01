import { AppShell } from './AppShell'

/**
 * The signed-in person's own pages. It has no sidebar yet: the account pages live in the
 * account menu, and a sidebar appears as soon as `navItems` is given the person's own sections.
 */
export function Layout() {
  return <AppShell homeHref="/" accountBase="/account" contentClassName="mx-auto w-full max-w-5xl py-12" />
}
