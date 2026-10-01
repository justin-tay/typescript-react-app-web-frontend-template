import { Button, GovtBanner, Navbar, NavbarBrand, NavbarContent, Sidebar, SkipNavLink } from '@opengovsg/oui'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Dialog, Modal, ModalOverlay } from 'react-aria-components'
import { Link, Outlet, useLocation } from 'react-router'
import { APP_NAME, COPYRIGHT_HOLDER, FOOTER_LINKS } from '@/config'
import { useCurrentUser } from '@/shared/session/auth-context'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { Footer } from '@/shared/ui/footer'
import { UserMenu } from './UserMenu'

const MAIN_CONTENT_ID = 'main-content'

/** Tailwind's `lg` breakpoint, where the sidebar replaces the drawer. */
const LARGE_SCREEN = '(min-width: 64rem)'

export interface ShellNavItem {
  href: string
  label: string
  /** Shown before the label. */
  icon?: ReactNode
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
  /** The accessible name of the navigation, so it can be told apart from the top bar's. */
  navLabel?: string
  isCurrent?: (item: ShellNavItem, pathname: string) => boolean
  /** Shown above the page, in the content column. */
  breadcrumbs?: ReactNode
  /** Extra classes on the content column, for example to centre and narrow it. */
  contentClassName?: string
}

function SidebarContent({
  pathname,
  label,
  items,
  isCurrent,
}: {
  pathname: string
  label?: string
  items: ShellNavItem[]
  isCurrent: (item: ShellNavItem, pathname: string) => boolean
}) {
  return (
    // OUI's sidebar renders a bare <nav> and takes no label, so name it here: with the top bar's
    // navigation there are otherwise two indistinguishable navigation landmarks.
    <div ref={(element) => element?.querySelector('nav')?.setAttribute('aria-label', label ?? 'Navigation')}>
      <Sidebar
        items={items.map((item) => ({
          href: item.href,
          children: item.label,
          startContent: item.icon,
          endContent: item.badge,
          isSelected: isCurrent(item, pathname),
          tooltip: item.label,
        }))}
      />
    </div>
  )
}

/**
 * The signed-in shell shared by the account and administration sections: a masthead, a full-width
 * top bar with the logo and account menu, an optional left navigation (a drawer below the `lg`
 * breakpoint, so the content column keeps room for wide tables beside it), the page, and a slim footer.
 *
 * OUI's `Sidebar` only collapses to an icon rail; it has no built-in small-screen drawer
 * (SGDS's equivalent component calls this a "scrim"), so the drawer is a React Aria modal dialog.
 */
export function AppShell({
  homeHref,
  accountBase,
  navItems = [],
  navLabel,
  isCurrent = (item, pathname) => pathname === item.href,
  breadcrumbs,
  contentClassName,
}: AppShellProps) {
  const { pathname } = useLocation()
  const user = useCurrentUser()
  const hasSidebar = navItems.length > 0
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)
  const mainRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const focusedPathname = useRef(pathname)

  // Close the drawer on navigation, following React's own pattern for adjusting state
  // during render in response to a prop/route change, rather than an effect for it.
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (isDrawerOpen) setIsDrawerOpen(false)
  }

  // The drawer exists only below `lg`. If the window grows past it (a tablet turned sideways) while it is
  // open, close it: it is hidden by CSS but would still lock the page and hide the content from assistive
  // technology. Kept in step with the `lg:` classes below.
  useEffect(() => {
    if (!isDrawerOpen || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(LARGE_SCREEN)
    const onChange = (event: MediaQueryListEvent) => event.matches && setIsDrawerOpen(false)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [isDrawerOpen])

  // Moving to another page moves focus to its heading (or the content area while it loads), so a
  // keyboard or screen-reader user is not left on the link they pressed. Not on first load (the ref
  // also keeps StrictMode's second run of the effect from counting as a move).
  useEffect(() => {
    if (focusedPathname.current === pathname) return
    focusedPathname.current = pathname
    const main = mainRef.current
    ;(main?.querySelector<HTMLElement>('h1') ?? main)?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <SkipNavLink id={MAIN_CONTENT_ID}>Skip to main content</SkipNavLink>
      <GovtBanner />
      <Navbar aria-label="Site">
        <NavbarBrand className="flex items-center">
          {hasSidebar && (
            <Button
              variant="clear"
              isIconOnly
              // The icon-only button pads its icon in by 12px; pull it back so the icon, not the
              // button, lines up with the page content's left edge.
              className="-ml-3 lg:hidden"
              ref={menuButtonRef}
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
          // Persistent on lg+; hidden below it in favour of the drawer. SidebarRoot renders as a
          // <nav class="w-full">, filling whatever it's put in, so the fixed width belongs on
          // this wrapper, not on SidebarRoot itself.
          <div className="hidden w-72 shrink-0 border-r border-base-divider-subtle lg:block">
            <SidebarContent pathname={pathname} label={navLabel} items={navItems} isCurrent={isCurrent} />
          </div>
        )}
        {hasSidebar && (
          // A modal dialog, so focus is trapped inside while it is open, Escape and a click outside
          // close it, the page behind is inert and does not scroll, and focus returns to the menu button.
          <ModalOverlay
            isOpen={isDrawerOpen}
            onOpenChange={(open) => {
              setIsDrawerOpen(open)
              // Dismissed with Escape or a click outside: back to the button that opened it. React Aria
              // does not always manage to restore focus there itself. A link press closes it separately,
              // and focus then goes to the new page.
              if (!open) setTimeout(() => menuButtonRef.current?.focus(), 50)
            }}
            isDismissable
            className="fixed inset-0 z-50 bg-base-canvas-overlay lg:hidden"
          >
            <Modal className="h-full w-72 max-w-full bg-base-canvas-default shadow-lg outline-none">
              <Dialog aria-label={navLabel ?? 'Navigation'} className="h-full outline-none">
                {/* Following any link closes the drawer, including the link to the page already open,
                    which would not change the path and so would not close it on its own. */}
                <div
                  className="h-full"
                  onClickCapture={(e) => {
                    // Only a plain click follows the link in this tab; a Ctrl/Cmd/Shift click opens it elsewhere.
                    const isPlainClick = e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey
                    if (isPlainClick && (e.target as HTMLElement).closest('a')) setIsDrawerOpen(false)
                  }}
                >
                  <SidebarContent pathname={pathname} label={navLabel} items={navItems} isCurrent={isCurrent} />
                </div>
              </Dialog>
            </Modal>
          </ModalOverlay>
        )}
        <div className="min-w-0 flex-1">
          <main
            ref={mainRef}
            id={MAIN_CONTENT_ID}
            tabIndex={-1}
            className={['flex flex-col gap-6 p-6 outline-none', contentClassName].filter(Boolean).join(' ')}
          >
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
