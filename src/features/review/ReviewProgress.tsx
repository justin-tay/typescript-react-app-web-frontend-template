import type { Progress } from './api'

/** How many of the active accounts are decided, as text and a bar. `compact` is the short form for a table row. */
export function ReviewProgress({ progress, compact = false }: { progress: Progress; compact?: boolean }) {
  const { reviewed, total } = progress
  const percent = total === 0 ? 100 : Math.floor((reviewed / total) * 100)
  return (
    <div className={compact ? 'flex min-w-32 flex-col gap-1' : 'flex min-w-48 flex-col gap-1'}>
      <p className="text-sm text-base-content-medium">
        {compact
          ? `${reviewed.toLocaleString()} of ${total.toLocaleString()}`
          : `${reviewed.toLocaleString()} / ${total.toLocaleString()} reviewed (${percent}%)`}
      </p>
      <div
        role="progressbar"
        aria-label="Accounts reviewed"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reviewed}
        className="h-2 overflow-hidden rounded-full bg-base-divider-subtle"
      >
        <div className="h-full bg-interaction-main-default" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
