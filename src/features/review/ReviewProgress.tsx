import type { Progress } from './api'

/** How many of the active accounts are decided, as text and a bar. */
export function ReviewProgress({ progress }: { progress: Progress }) {
  const { reviewed, total } = progress
  const percent = total === 0 ? 100 : Math.floor((reviewed / total) * 100)
  return (
    <div className="flex min-w-48 flex-col gap-1">
      <p className="text-sm text-base-content-medium">
        {reviewed.toLocaleString()} / {total.toLocaleString()} reviewed ({percent}%)
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
