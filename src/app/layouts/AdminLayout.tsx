import { Breadcrumb, Breadcrumbs } from '@opengovsg/oui'
import { useLocation } from 'react-router'
import { useCurrentUser } from '@/shared/session/auth-context'
import { Badge } from '@opengovsg/oui'
import { useTaskSummary } from '@/features/review/use-task-summary'
import { hasAnyRole, hasRole, type AdminRole } from '@/shared/session/user'
import { AppShell, type ShellNavItem } from './AppShell'

interface NavItem extends ShellNavItem {
  /** The roles a person needs, any one of them, for this section; everyone in admin sees the dashboard. */
  roles?: AdminRole[]
  /** Only the exact path is this item, not the paths under it. */
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users', roles: ['USER_MANAGE'] },
  { href: '/admin/groups', label: 'Groups', roles: ['GROUP_MANAGE'] },
  { href: '/admin/reviews', label: 'Account reviews', roles: ['ACCOUNT_REVIEWER'] },
  { href: '/admin/audit', label: 'Audit trail', roles: ['ACCOUNT_REVIEWER', 'USER_MANAGE'] },
  { href: '/admin/settings', label: 'Settings', roles: ['SETTINGS_MANAGE'] },
]

/** The person's own account pages, reached from the account menu rather than the sidebar. */
const ACCOUNT_PAGES: Record<string, string> = {
  '/admin/account/personal-info': 'Personal info',
  '/admin/account/signing-in': 'Sign-in methods',
}

/** A detail page (/admin/users/123) belongs to its list's nav item. */
const isCurrent = (item: NavItem, pathname: string) =>
  pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`))

/**
 * The administration section: the shared shell with a left nav for switching between the admin
 * resources and breadcrumbs above the page. Full page width, since tables here tend to need the room.
 */
export function AdminLayout() {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const summary = useTaskSummary(hasRole(user, 'ACCOUNT_REVIEWER'), pathname)
  const items = NAV_ITEMS.filter((item) => !item.roles || hasAnyRole(user, item.roles)).map((item) =>
    item.href === '/admin/reviews' && summary && summary.openCount > 0
      ? {
          ...item,
          badge: (
            <Badge color={summary.overdueCount > 0 ? 'critical' : 'main'}>
              {summary.overdueCount > 0 ? `${summary.overdueCount} overdue` : `${summary.openCount} open`}
            </Badge>
          ),
        }
      : item,
  )
  const currentItem = NAV_ITEMS.find((item) => isCurrent(item, pathname))
  const isDetailPage = currentItem !== undefined && pathname !== currentItem.href
  const accountLabel = ACCOUNT_PAGES[pathname]

  return (
    <AppShell
      homeHref="/admin"
      accountBase="/admin/account"
      navItems={items}
      navTitle="Manage"
      isCurrent={(item, path) => isCurrent(item as NavItem, path)}
      breadcrumbs={
        // Scoped to the content column, not spanning the sidebar, matching SGDS's own page
        // templates: the breadcrumb sits above the page's heading, not the shell.
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
              <Breadcrumb>{currentItem?.label ?? accountLabel ?? ''}</Breadcrumb>
            ))}
          {isDetailPage && <Breadcrumb>Details</Breadcrumb>}
        </Breadcrumbs>
      }
    />
  )
}
