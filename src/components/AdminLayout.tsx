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
import { useAuth } from '../auth/auth-context'
import { APP_NAME } from '../config'
import { UserMenu } from './UserMenu'

const NAV_ITEMS = [
  { href: '/users', label: 'Users' },
  { href: '/groups', label: 'Groups' },
  { href: '/roles', label: 'Roles' },
]

function AdminSidebarContent({ pathname }: { pathname: string }) {
  return (
    <SidebarRoot>
      <SidebarHeader>Manage</SidebarHeader>
      <ul>
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.href} href={item.href} isSelected={pathname === item.href}>
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
  const { state } = useAuth()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)
  const currentItem = NAV_ITEMS.find((item) => item.href === pathname)

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
          <Link to="/" className="text-lg font-semibold">
            {APP_NAME}
          </Link>
        </NavbarBrand>
        <NavbarContent justify="end">
          {state.status === 'authenticated' && <UserMenu user={state.user} />}
        </NavbarContent>
      </Navbar>
      <div className="flex flex-1">
        {/* Persistent on md+; hidden below it in favour of the drawer. SidebarRoot renders
            as a <nav class="w-full">, filling whatever it's put in, so the fixed width
            belongs on this wrapper, not on SidebarRoot itself. */}
        <div className="hidden w-64 shrink-0 border-r border-base-divider-subtle md:block">
          <AdminSidebarContent pathname={pathname} />
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
              <AdminSidebarContent pathname={pathname} />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <main className="flex flex-col gap-6 p-6">
            {/* Scoped to the content column, not spanning the sidebar, matching SGDS's own
                page templates: the breadcrumb sits above the page's heading, not the shell. */}
            <Breadcrumbs>
              <Breadcrumb href="/">Home</Breadcrumb>
              <Breadcrumb>{currentItem?.label ?? ''}</Breadcrumb>
            </Breadcrumbs>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
