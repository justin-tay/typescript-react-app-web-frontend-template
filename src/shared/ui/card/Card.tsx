import type { ReactNode } from 'react'

export interface CardProps {
  /** Heading shown at the top of the card. */
  title?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * A bordered panel. OUI has no card, so this follows the shape of SGDS's Card: 8px
 * corners and a 1px border, with no shadow.
 */
export function Card({ title, children, className }: CardProps) {
  return (
    <section
      className={[
        'flex flex-col gap-4 rounded-lg border border-base-divider-medium bg-base-canvas-default p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title && <h2 className="text-lg font-semibold text-base-content-strong">{title}</h2>}
      {children}
    </section>
  )
}
