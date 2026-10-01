import { Badge, Link } from '@opengovsg/oui'
import { formatDate } from '@/shared/lib/format'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasRole } from '@/shared/session/user'
import { Card } from '@/shared/ui/card'
import { useTaskSummary } from './use-task-summary'

const reviews = (count: number) => `${count} account ${count === 1 ? 'review' : 'reviews'}`

/**
 * What the account reviewer has to do, for the administration overview: an overdue review first, then
 * one that is open, otherwise that there is nothing. Only for someone who can act on reviews; for anyone
 * else, and until the figures arrive, it shows nothing. A failed load is also just nothing, as for the
 * sidebar badge: this is a reminder, not worth an error message.
 */
export function ReviewAttention() {
  const user = useCurrentUser()
  const summary = useTaskSummary(hasRole(user, 'ACCOUNT_REVIEWER'), 'overview')
  if (!summary) return null

  const { openCount, overdueCount, earliestDueDate } = summary
  return (
    <Card title="Needs your attention">
      {openCount === 0 ? (
        <p className="text-base-content-medium">Nothing needs your attention.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {overdueCount > 0 ? (
              <>
                <Badge color="critical">Overdue</Badge>
                <p>{reviews(overdueCount)} overdue.</p>
              </>
            ) : (
              <>
                <Badge color="main">Open</Badge>
                <p>
                  {reviews(openCount)} open{earliestDueDate ? `, due ${formatDate(earliestDueDate)}` : ''}.
                </p>
              </>
            )}
          </div>
          <Link href="/admin/reviews">Go to account reviews</Link>
        </div>
      )}
    </Card>
  )
}
