import { Link } from '@opengovsg/oui'
import type { ReactNode } from 'react'
import { APP_NAME } from '@/config'

export interface PageHeaderProps {
  title: ReactNode
  /** One line under the title, saying what the page is for. */
  subtitle?: ReactNode
  /** Shown beside the title, for example a status badge. */
  badge?: ReactNode
  /** Buttons at the right of the header. */
  actions?: ReactNode
  /** A link back to the list this page came from, shown above the title. */
  backLink?: { href: string; label: string }
  /**
   * Show the back link only below the `lg` breakpoint. For a page whose shell shows a breadcrumb from `lg`
   * up, which says the same thing, so that one or the other is on screen and never both.
   */
  backLinkSmallOnly?: boolean
}

/**
 * The title block at the top of a page: optional back link, title, subtitle and actions. A text title
 * is also the browser tab title, and is where focus goes when the person moves to this page (see `AppShell`).
 *
 * The tab title is a `<title>` element, which React moves into the document head and removes with the
 * page. It goes ahead of the static `<title>` in `index.html`, which is what the tab shows before
 * anything loads and when a page has no text title; `PageHeader.test.tsx` pins that order.
 */
export function PageHeader({ title, subtitle, badge, actions, backLink, backLinkSmallOnly }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {typeof title === 'string' && <title>{`${title} - ${APP_NAME}`}</title>}
      {backLink && (
        <Link href={backLink.href} className={backLinkSmallOnly ? 'touch-target text-sm lg:hidden' : 'text-sm'}>
          <span aria-hidden="true">← </span>
          {backLink.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 tabIndex={-1} className="text-2xl font-semibold text-base-content-strong outline-none">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && <p className="text-base-content-medium">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
