import { Link } from '@opengovsg/oui'

export interface FooterLinkData {
  label: string
  href: string
  /** The link leaves this site: it gets an icon, opens in a new tab and says so to screen readers. */
  external?: boolean
}

/** The small "box with an arrow" SGDS shows after a link that goes to another site. */
function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9v3.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1H7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface FooterLinkProps extends FooterLinkData {
  className?: string
}

/** A link for the footer or the sign-in card; `external` adds the icon and new-tab behaviour. */
export function FooterLink({ label, href, external, className }: FooterLinkProps) {
  return (
    <Link
      href={href}
      className={['inline-flex items-center gap-1 py-3 sm:py-0', className].filter(Boolean).join(' ')}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {label}
      {external && (
        <>
          <ExternalLinkIcon />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </Link>
  )
}
