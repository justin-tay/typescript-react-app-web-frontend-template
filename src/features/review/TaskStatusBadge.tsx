import { Badge } from '@opengovsg/oui'
import type { Task } from './api'

/** `open`, `overdue` or `completed`: an open task past its due date is called overdue. */
export function TaskStatusBadge({ task }: { task: Pick<Task, 'status' | 'overdue'> }) {
  if (task.status === 'completed') return <Badge color="neutral">Completed</Badge>
  if (task.overdue) return <Badge color="critical">Overdue</Badge>
  return <Badge color="main">Open</Badge>
}
