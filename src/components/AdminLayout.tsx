import { GovtBanner, SidebarHeader, SidebarItem, SidebarRoot } from '@opengovsg/oui'
import { Link, Outlet, useLocation } from 'react-router'
import { APP_NAME } from '../config'
import { useAuth } from '../auth/auth-context'
import { UserMenu } from './UserMenu'

const NAV_ITEMS = [
  { href: '/users', label: 'Users' },
  { href: '/groups', label: 'Groups' },
  { href: '/roles', label: 'Roles' },
]

/**
 * The admin section's own shell: a left nav and the full page width, instead of the
 * public site's centred header/footer layout. Tables here (users, groups, roles) tend to
 * need the room, so this layout intentionally does not share `Layout.tsx`.
 */
export function AdminLayout() {
  const { pathname } = useLocation()
  const { state } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <GovtBanner />
      <div className="flex flex-1">
        {/* SidebarRoot renders as a <nav class="w-full">, filling whatever it's put in, so
            the fixed width belongs on this wrapper, not on SidebarRoot itself. */}
        <div className="w-64 shrink-0 border-r border-base-divider-subtle">
          <SidebarRoot>
            <SidebarHeader>
              <Link to="/" className="text-lg font-semibold">
                {APP_NAME}
              </Link>
            </SidebarHeader>
            <ul>
              {NAV_ITEMS.map((item) => (
                <SidebarItem key={item.href} href={item.href} isSelected={pathname === item.href}>
                  {item.label}
                </SidebarItem>
              ))}
            </ul>
          </SidebarRoot>
        </div>
        <div className="min-w-0 flex-1">
          <header className="flex justify-end border-b border-base-divider-subtle px-6 py-3">
            {state.status === 'authenticated' && <UserMenu user={state.user} />}
          </header>
          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
