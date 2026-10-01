import {
  Button,
  GovtBanner,
  Navbar,
  NavbarBrand,
  NavbarContent,
  SidebarHeader,
  SidebarItem,
  SidebarRoot,
} from '@opengovsg/oui'
import { useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { APP_NAME, COPYRIGHT_HOLDER, FOOTER_LINKS } from '@/config'
import { useCurrentUser } from '@/shared/session/auth-context'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { Footer } from '@/shared/ui/footer'
import { UserMenu } from './UserMenu'

export interface ShellNavItem {
  href: string
  label: string
  /** Shown after the label, for example an open-task count. */
  badge?: ReactNode
}

export interface AppShellProps {
  /** Where the logo links to. */
  homeHref: string
  /** The account pages' address prefix, for the account menu. */
  accountBase: string
  /** Left navigation. With none, there is no sidebar and no drawer button. */
  navItems?: ShellNavItem[]
  navTitle?: string
  isCurrent?: (item: ShellNavItem, pathname: string) => boolean
  /** Shown above the page, in the content column. */
  breadcrumbs?: ReactNode
  /** Extra classes on the content column, for example to centre and narrow it. */
  contentClassName?: string
}

function SidebarContent({
  pathname,
  title,
  items,
  isCurrent,
}: {
  pathname: string
  title?: string
  items: ShellNavItem[]
  isCurrent: (item: ShellNavItem, pathname: string) => boolean
}) {
  return (
    <SidebarRoot>
      {title && <SidebarHeader>{title}</SidebarHeader>}
      <ul>
        {items.map((item) => (
          <SidebarItem key={item.href} href={item.href} isSelected={isCurrent(item, pathname)}>
            <span className="flex items-center gap-2">
              {item.label}
              {item.badge}
            </span>
          </SidebarItem>
        ))}
      </ul>
    </SidebarRoot>
  )
}

/**
 * The signed-in shell shared by the account and administration sections: a masthead, a full-width
 * top bar with the logo and account menu, an optional left navigation (a drawer below the `md`
 * breakpoint), the page, and a slim footer.
 *
 * OUI's `Sidebar` only collapses to an icon rail; it has no built-in small-screen drawer
 * (SGDS's equivalent component calls this a "scrim"), so the drawer below is hand-built.
 */
export function AppShell({
  homeHref,
  accountBase,
  navItems = [],
  navTitle,
  isCurrent = (item, pathname) => pathname === item.href,
  breadcrumbs,
  contentClassName,
}: AppShellProps) {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const hasSidebar = navItems.length > 0
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)

  // Close the drawer on navigation, following React's own pattern for adjusting state
  // during render in response to a prop/route change, rather than an effect for it.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (isDrawerOpen) setIsDrawerOpen(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <GovtBanner />
      <Navbar>
        <NavbarBrand className="flex items-center">
          {hasSidebar && (
            <Button
              variant="clear"
              isIconOnly
              // The icon-only button pads its icon in by 12px; pull it back so the icon, not the
              // button, lines up with the page content's left edge.
              className="-ml-3 md:hidden"
              aria-label="Open navigation"
              onPress={() => setIsDrawerOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Button>
          )}
          <Link to={homeHref} className="min-w-0">
            <BrandLogo name={APP_NAME} />
          </Link>
        </NavbarBrand>
        <NavbarContent justify="end">
          <UserMenu user={user} accountBase={accountBase} />
        </NavbarContent>
      </Navbar>
      <div className="flex flex-1">
        {hasSidebar && (
          // Persistent on md+; hidden below it in favour of the drawer. SidebarRoot renders as a
          // <nav class="w-full">, filling whatever it's put in, so the fixed width belongs on
          // this wrapper, not on SidebarRoot itself.
          <div className="hidden w-64 shrink-0 border-r border-base-divider-subtle md:block">
            <SidebarContent pathname={pathname} title={navTitle} items={navItems} isCurrent={isCurrent} />
          </div>
        )}
        {hasSidebar && isDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-base-canvas-overlay"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="relative h-full w-64 bg-base-canvas-default shadow-lg">
              <SidebarContent pathname={pathname} title={navTitle} items={navItems} isCurrent={isCurrent} />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <main className={['flex flex-col gap-6 p-6', contentClassName].filter(Boolean).join(' ')}>
            {breadcrumbs}
            {/* Inside the shell, so a page that fails to render leaves the navigation usable; moving to another page clears it. */}
            <ErrorBoundary resetKey={pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <Footer links={FOOTER_LINKS} copyrightHolder={COPYRIGHT_HOLDER} />
    </div>
  )
}
