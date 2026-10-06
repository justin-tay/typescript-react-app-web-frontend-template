const DAY_MS = 24 * 60 * 60 * 1000

const days = (from: string, to: Date) => Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / DAY_MS))

/**
 * Whole days since the account's last activity, which is what the backend's inactivity job counts from: the later of
 * the last sign-in and when the inactivity clock started (creation, or the last unsuspension). That also covers an
 * account that never signed in. `endedAt` is when the count stops (a decision, a suspension or a removal), so a figure
 * that is over does not shift; without it, it counts to now. Null when the backend has no value, which is a removal
 * recorded before the field existed: unknown, not zero.
 */
export function inactiveDays(
  { lastActivityAt, endedAt }: { lastActivityAt?: string | null; endedAt?: string | null },
  now: Date,
): number | null {
  if (!lastActivityAt) return null
  return days(lastActivityAt, endedAt ? new Date(endedAt) : now)
}
