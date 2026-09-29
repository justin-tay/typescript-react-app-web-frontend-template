import { Spinner } from '@opengovsg/oui'
import type { ReactNode } from 'react'

export interface StatCardProps {
  label: string
  /** `loading` shows a spinner; `unavailable` says the figure could not be shown. */
  value: number | 'loading' | 'unavailable'
  icon?: ReactNode
  /** Makes the whole card a button, for example to open the list the figure counts. */
  onPress?: () => void
}

/** A single figure with a label, for a dashboard. */
export function StatCard({ label, value, icon, onPress }: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-sm text-base-content-medium">
        {icon && <span aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-3xl font-semibold text-base-content-strong">
        {value === 'loading' ? (
          <Spinner aria-label={`Loading ${label}`} />
        ) : value === 'unavailable' ? (
          <span className="text-base text-base-content-medium">Not available</span>
        ) : (
          value.toLocaleString()
        )}
      </div>
    </>
  )
  const className =
    'flex flex-col gap-2 rounded-lg border border-base-divider-medium bg-base-canvas-default p-6 text-left'
  return onPress ? (
    <button
      type="button"
      onClick={onPress}
      className={`${className} hover:border-interaction-main-default focus-visible:outline-2 focus-visible:outline-utility-focus-default`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}
