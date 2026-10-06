import { inactiveDays } from '@/shared/lib/inactivity'
import { formatDate } from '@/shared/lib/format'

/** The date of the last sign-in. */
export function LastLogin({ lastLoginAt }: { lastLoginAt?: string | null }) {
  return lastLoginAt ? (
    <span>{formatDate(lastLoginAt.slice(0, 10))}</span>
  ) : (
    <span className="text-base-content-medium">Never signed in</span>
  )
}

/**
 * Whole days since the last activity. `endedAt` is when the count stops (a decision, a suspension or a removal), so a
 * figure that is over does not shift; without it, it counts to now. `endedLabel` says what it stopped at.
 */
export function DaysInactive({
  lastActivityAt,
  endedAt,
  endedLabel,
}: {
  lastActivityAt?: string | null
  endedAt?: string | null
  endedLabel: string
}) {
  const count = inactiveDays({ lastActivityAt, endedAt }, new Date())
  if (count === null)
    return (
      <span className="text-base-content-medium" title="Not recorded">
        Unknown
      </span>
    )
  return (
    <div className="flex flex-col">
      <span>{count.toLocaleString()}</span>
      {endedAt && <span className="text-sm text-base-content-medium">{endedLabel}</span>}
    </div>
  )
}
