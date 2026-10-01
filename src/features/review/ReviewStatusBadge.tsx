import { Badge } from '@opengovsg/oui'
import type { ReviewStatus } from './api'
import { humanize } from '@/shared/lib/labels'

const COLOURS: Record<ReviewStatus, 'warning' | 'success' | 'neutral'> = {
  pending_verification: 'warning',
  verified: 'success',
  removed: 'neutral',
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge color={COLOURS[status] ?? 'neutral'}>{humanize(status)}</Badge>
}
