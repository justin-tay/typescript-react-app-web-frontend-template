const DAY_MS = 24 * 60 * 60 * 1000

const days = (from: string, to: Date) => Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / DAY_MS))

/**
 * How long an account had gone without signing in, as text. While it waits for a decision that is up to now; once
 * reviewed it is up to the decision, because `lastLoginAt` is frozen then and a figure that kept growing would
 * misstate what the reviewer saw. An account that never signed in has no figure: the API does not say when it was
 * created, so there is nothing to count from. This is days since the last sign-in, not the backend's inactivity
 * clock, which also restarts on unsuspend.
 */
export function inactivityLabel(
  { lastLoginAt, decidedAt }: { lastLoginAt?: string | null; decidedAt?: string | null },
  now: Date,
): string {
  if (!lastLoginAt) return 'Never signed in'
  const decided = Boolean(decidedAt)
  const count = days(lastLoginAt, decided ? new Date(decidedAt as string) : now)
  if (count === 0) return decided ? 'Active when reviewed' : 'Signed in today'
  return `Inactive ${count} ${count === 1 ? 'day' : 'days'}${decided ? ' when reviewed' : ''}`
}
