import { Link } from '@opengovsg/oui'
import type { ReactNode } from 'react'

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
}

/** The title block at the top of a page: optional back link, title, subtitle and actions. */
export function PageHeader({ title, subtitle, badge, actions, backLink }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      {backLink && (
        <Link href={backLink.href} className="text-sm">
          <span aria-hidden="true">← </span>
          {backLink.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-base-content-strong">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-base-content-medium">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
