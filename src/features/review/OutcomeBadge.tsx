import { Badge } from '@opengovsg/oui'
import type { Outcome } from './api'

const OUTCOMES: Record<Outcome, { label: string; color: 'warning' | 'success' | 'main' | 'critical' }> = {
  pending: { label: 'Not reviewed', color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'success' },
  confirmed_groups_edited: { label: 'Confirmed (Groups Edited)', color: 'main' },
  removed: { label: 'Removed', color: 'critical' },
}

/** The outcome of one account in the review, as the chip the reviewer scans for. */
export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const { label, color } = OUTCOMES[outcome] ?? { label: outcome, color: 'warning' as const }
  return <Badge color={color}>{label}</Badge>
}
