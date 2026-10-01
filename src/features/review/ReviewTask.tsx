import { Infobox, Spinner, Tab, TabList, TabPanel, Tabs } from '@opengovsg/oui'
import { useState } from 'react'
import { useParams } from 'react-router'
import { getTask, type ReviewCategory } from './api'
import { ReviewItemsTable } from './ReviewItemsTable'
import { TaskStatusBadge } from './TaskStatusBadge'
import { ApiError } from '@/shared/lib/api-errors'
import { formatDate, formatDateTime } from '@/shared/lib/format'
import { humanize } from '@/shared/lib/labels'
import { useResource } from '@/shared/lib/use-resource'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'

const CATEGORIES: { id: ReviewCategory; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'removed', label: 'Removed' },
]

const TAB_KEY = 'review-tab:'

function loadTab(taskId: string): ReviewCategory {
  try {
    const stored = sessionStorage.getItem(TAB_KEY + taskId)
    return CATEGORIES.some(({ id }) => id === stored) ? (stored as ReviewCategory) : 'active'
  } catch {
    return 'active'
  }
}

/** One review task: where it stands, and its accounts by category. */
export function ReviewTask() {
  const { taskId = '' } = useParams()
  const state = useResource(getTask, [taskId])
  const { reload } = state
  const [tab, setTab] = useState<ReviewCategory>(() => loadTab(taskId))

  const back = { href: '/admin/reviews', label: 'Back to reviews' }
  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'error') {
    const status = state.error instanceof ApiError ? state.error.status : undefined
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Review" backLink={back} backLinkSmallOnly />
        <Infobox variant={status === 403 ? 'warning' : 'error'}>
          {status === 404 ? 'This review does not exist.' : state.error.message}
        </Infobox>
      </div>
    )
  }

  const { data: task } = state
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={humanize(task.type)}
        badge={<TaskStatusBadge task={task} />}
        subtitle={`${formatDate(task.startDate)} to ${formatDate(task.dueDate)}`}
        backLink={back}
        backLinkSmallOnly
      />
      {task.status === 'completed' && (
        <Infobox variant="info">
          Completed{task.completedAt ? ` on ${formatDateTime(task.completedAt)}` : ''}
          {task.completedBy ? ` by ${task.completedBy}` : ''}. Decisions are closed; you can still suspend and unsuspend
          accounts.
        </Infobox>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="To verify" value={task.counts.pending_verification ?? 0} />
        <StatCard label="Verified" value={task.counts.verified ?? 0} />
        <StatCard label="Removed" value={task.counts.removed ?? 0} />
      </div>
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => {
          const next = key as ReviewCategory
          setTab(next)
          try {
            sessionStorage.setItem(TAB_KEY + taskId, next)
          } catch {
            // The tab just will not survive a refresh.
          }
        }}
      >
        <TabList aria-label="Accounts by category">
          {CATEGORIES.map(({ id, label }) => (
            <Tab key={id} id={id}>
              {label}
            </Tab>
          ))}
        </TabList>
        {CATEGORIES.map(({ id }) => (
          <TabPanel key={id} id={id} className="pt-4">
            <ReviewItemsTable task={task} category={id} onChanged={reload} />
          </TabPanel>
        ))}
      </Tabs>
    </section>
  )
}
