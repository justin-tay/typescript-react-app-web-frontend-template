import { Badge, Breadcrumb, Breadcrumbs } from '@opengovsg/oui'
import { ClipboardCheck, House, ScrollText, Settings, User, Users } from 'lucide-react'
import { useLocation } from 'react-router'
import { useCurrentUser } from '@/shared/session/auth-context'
import { useTaskSummary } from '@/features/review/use-task-summary'
import { hasAnyRole, hasRole, type AdminRole } from '@/shared/session/user'
import { AppShell, type ShellNavItem } from './AppShell'

interface NavItem extends ShellNavItem {
  /** The roles a person needs, any one of them, for this section; everyone in admin sees the overview. */
  roles?: AdminRole[]
  /** Only the exact path is this item, not the paths under it. */
  exact?: boolean
}

const icon = (Icon: typeof House) => <Icon size={18} aria-hidden="true" />

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: icon(House), exact: true },
  { href: '/admin/users', label: 'Users', icon: icon(User), roles: ['USER_MANAGE'] },
  { href: '/admin/groups', label: 'Groups', icon: icon(Users), roles: ['GROUP_MANAGE'] },
  { href: '/admin/reviews', label: 'Account reviews', icon: icon(ClipboardCheck), roles: ['ACCOUNT_REVIEWER'] },
  { href: '/admin/audit', label: 'Audit trail', icon: icon(ScrollText), roles: ['ACCOUNT_REVIEWER', 'USER_MANAGE'] },
  { href: '/admin/settings', label: 'Settings', icon: icon(Settings), roles: ['SETTINGS_MANAGE'] },
]

/** The person's own account pages, reached from the account menu rather than the sidebar. */
const ACCOUNT_PAGES: Record<string, string> = {
  '/admin/account/personal-info': 'Personal info',
  '/admin/account/signing-in': 'Sign-in methods',
}

const REVIEW_SECTION = /^\/admin\/reviews\/([^/]+)\/(active|suspended|removed)$/
const REVIEW_PAGE = /^\/admin\/reviews\/[^/]+$/
const REVIEW_SECTION_LABELS: Record<string, string> = {
  active: 'Active accounts',
  suspended: 'Suspended accounts',
  removed: 'Removed accounts',
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
  const reviewSection = REVIEW_SECTION.exec(pathname)
  const isReviewPage = REVIEW_PAGE.test(pathname)

  return (
    <AppShell
      homeHref="/admin"
      accountBase="/admin/account"
      navItems={items}
      navLabel="Administration"
      isCurrent={(item, path) => isCurrent(item as NavItem, path)}
      breadcrumbs={
        // The root is the section, "Administration", not a page: the overview is where it leads, and
        // the sidebar already lists it. No trail on the overview itself, where it would only point at
        // the page you are on. Scoped to the content column, not spanning the sidebar, matching SGDS's
        // own page templates: the breadcrumb sits above the page's heading, not the shell.
        pathname === '/admin' ? undefined : (
          // From `lg` up; below it the detail pages' "Back to ..." link does the same job.
          <Breadcrumbs className="hidden lg:flex">
            <Breadcrumb href="/admin">Administration</Breadcrumb>
            {isDetailPage ? (
              <Breadcrumb href={currentItem.href}>{currentItem.label}</Breadcrumb>
            ) : (
              <Breadcrumb>{currentItem?.label ?? accountLabel ?? ''}</Breadcrumb>
            )}
            {/* A review is a page of its own with a page under it for each part: Account review > Active accounts. */}
            {reviewSection ? (
              <>
                <Breadcrumb href={`/admin/reviews/${reviewSection[1]}`}>Account review</Breadcrumb>
                <Breadcrumb>{REVIEW_SECTION_LABELS[reviewSection[2]]}</Breadcrumb>
              </>
            ) : (
              isDetailPage && <Breadcrumb>{isReviewPage ? 'Account review' : 'Details'}</Breadcrumb>
            )}
          </Breadcrumbs>
        )
      }
    />
  )
}
