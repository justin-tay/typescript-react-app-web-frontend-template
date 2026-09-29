export interface LogoMarkProps {
  /** Width and height in pixels. */
  size?: number
  /** Gives the mark an accessible name. Leave out when the app name is written beside it. */
  title?: string
  className?: string
}

/**
 * The logo mark: two figures shoulder to shoulder, whose arms meet to form an M. It is
 * mirror-symmetric and has no text. Colours come from `--logo-primary` and `--logo-accent`
 * (see `index.css`), so re-colouring it, or showing it in white on a dark panel, is a matter
 * of setting those two variables. `public/favicon.svg` is the same drawing with fixed colours.
 */
export function LogoMark({ size = 32, title, className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      <path
        d="M10 56V36C10 30 14 26 20 26C26 26 30 32 32 40C34 32 38 26 44 26C50 26 54 30 54 36V56"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: 'var(--logo-primary, #1677D2)' }}
      />
      <circle cx="20" cy="12" r="8" style={{ fill: 'var(--logo-accent, #58A9F2)' }} />
      <circle cx="44" cy="12" r="8" style={{ fill: 'var(--logo-accent, #58A9F2)' }} />
    </svg>
  )
}
