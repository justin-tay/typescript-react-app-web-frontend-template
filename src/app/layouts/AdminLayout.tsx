import {
  Breadcrumb,
  Breadcrumbs,
  Button,
  GovtBanner,
  Navbar,
  NavbarBrand,
  NavbarContent,
  SidebarHeader,
  SidebarItem,
  SidebarRoot,
} from '@opengovsg/oui'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasRole } from '@/shared/session/user'
import { APP_NAME } from '@/config'
import { UserMenu } from './UserMenu'

interface NavItem {
  href: string
  label: string
  /** The administration role a person needs for this section; everyone in admin sees the dashboard. */
  role?: string
  /** Only the exact path is this item, not the paths under it. */
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users', role: 'USER_MANAGE' },
  { href: '/admin/groups', label: 'Groups', role: 'GROUP_MANAGE' },
  { href: '/admin/roles', label: 'Roles', role: 'ROLE_MANAGE' },
]

/** A detail page (/admin/users/123) belongs to its list's nav item. */
const isCurrent = (item: NavItem, pathname: string) =>
  pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`))

function AdminSidebarContent({ pathname, items }: { pathname: string; items: NavItem[] }) {
  return (
    <SidebarRoot>
      <SidebarHeader>Manage</SidebarHeader>
      <ul>
        {items.map((item) => (
          <SidebarItem key={item.href} href={item.href} isSelected={isCurrent(item, pathname)}>
            {item.label}
          </SidebarItem>
        ))}
      </ul>
    </SidebarRoot>
  )
}

/**
 * The admin section's own shell: a masthead, a top navbar (brand and account menu, plus a
 * drawer toggle below the `md` breakpoint), breadcrumbs, and a left nav for switching
 * between the admin resources. Full page width, instead of the public site's centred
 * header/footer layout, since tables here tend to need the room.
 *
 * OUI's `Sidebar` only collapses to an icon rail; it has no built-in small-screen drawer
 * (SGDS's equivalent component calls this a "scrim"), so the drawer below is hand-built.
 */
export function AdminLayout() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const items = NAV_ITEMS.filter((item) => !item.role || hasRole(user, item.role))
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)
  const currentItem = NAV_ITEMS.find((item) => isCurrent(item, pathname))
  const isDetailPage = currentItem !== undefined && pathname !== currentItem.href

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
        <NavbarBrand>
          <Button
            variant="clear"
            className="mr-2 md:hidden"
            aria-label="Open navigation"
            onPress={() => setIsDrawerOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Button>
          <Link to="/admin" className="min-w-0">
            <BrandLogo name={APP_NAME} />
          </Link>
        </NavbarBrand>
        <NavbarContent justify="end">
          <UserMenu user={user} showAccount={false} />
        </NavbarContent>
      </Navbar>
      <div className="flex flex-1">
        {/* Persistent on md+; hidden below it in favour of the drawer. SidebarRoot renders
            as a <nav class="w-full">, filling whatever it's put in, so the fixed width
            belongs on this wrapper, not on SidebarRoot itself. */}
        <div className="hidden w-64 shrink-0 border-r border-base-divider-subtle md:block">
          <AdminSidebarContent pathname={pathname} items={items} />
        </div>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-base-canvas-overlay"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="relative h-full w-64 bg-base-canvas-default shadow-lg">
              <AdminSidebarContent pathname={pathname} items={items} />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <main className="flex flex-col gap-6 p-6">
            {/* Scoped to the content column, not spanning the sidebar, matching SGDS's own
                page templates: the breadcrumb sits above the page's heading, not the shell. */}
            <Breadcrumbs>
              {pathname === '/admin' ? (
                <Breadcrumb>Dashboard</Breadcrumb>
              ) : (
                <Breadcrumb href="/admin">Dashboard</Breadcrumb>
              )}
              {pathname !== '/admin' &&
                (isDetailPage ? (
                  <Breadcrumb href={currentItem.href}>{currentItem.label}</Breadcrumb>
                ) : (
                  <Breadcrumb>{currentItem?.label ?? ''}</Breadcrumb>
                ))}
              {isDetailPage && <Breadcrumb>Details</Breadcrumb>}
            </Breadcrumbs>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
