import { Badge } from '@opengovsg/oui'
import type { UserStatus } from './api'

const STATUS_BADGE: Record<UserStatus, { color: 'success' | 'warning' | 'neutral'; label: string }> = {
  active: { color: 'success', label: 'Active' },
  suspended: { color: 'neutral', label: 'Suspended' },
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { color, label } = STATUS_BADGE[status]
  return <Badge color={color}>{label}</Badge>
}
