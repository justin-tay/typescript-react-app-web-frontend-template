import { Infobox, Spinner, Tab, TabList, TabPanel, Tabs } from '@opengovsg/oui'
import { useState } from 'react'
import { useParams } from 'react-router'
import { ActiveAccounts } from './ActiveAccounts'
import { getTask, type Population } from './api'
import { PopulationTab } from './PopulationTab'
import { ReportDownloads } from './ReportDownloads'
import { ReviewProgress } from './ReviewProgress'
import { TaskStatusBadge } from './TaskStatusBadge'
import { ApiError } from '@/shared/lib/api-errors'
import { formatDate, formatDateTime } from '@/shared/lib/format'
import { humanize } from '@/shared/lib/labels'
import { useResource } from '@/shared/lib/use-resource'
import { PageHeader } from '@/shared/ui/page-header'

type TabId = 'active' | Population

const TAB_IDS: TabId[] = ['active', 'suspended', 'removed']

const TAB_KEY = 'review-tab:'

function loadTab(taskId: string): TabId {
  try {
    const stored = sessionStorage.getItem(TAB_KEY + taskId)
    return TAB_IDS.find((id) => id === stored) ?? 'active'
  } catch {
    return 'active'
  }
}

function CountPill({ count }: { count: number }) {
  return (
    <span className="ml-2 rounded-full bg-base-canvas-alt px-2 text-sm" aria-label={`${count} accounts`}>
      {count.toLocaleString()}
    </span>
  )
}

/** One review task: where it stands, its three lists, and the report. */
export function ReviewTask() {
  const { taskId = '' } = useParams()
  const state = useResource(getTask, [taskId])
  const { reload } = state
  const [tab, setTab] = useState<TabId>(() => loadTab(taskId))

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
  const counts: Record<TabId, number | null | undefined> = {
    active: task.progress.total,
    // Once confirmed the count is the frozen list's; until then the lists show it themselves.
    suspended: task.populations.suspended.count,
    removed: task.populations.removed.count,
  }
  const tabs: { id: TabId; label: string }[] = [
    { id: 'active', label: 'Active accounts' },
    { id: 'suspended', label: 'Suspended accounts' },
    { id: 'removed', label: 'Removed accounts' },
  ]

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={humanize(task.type)}
        badge={<TaskStatusBadge task={task} />}
        subtitle={`${formatDate(task.startDate)} to ${formatDate(task.dueDate)}`}
        actions={<ReviewProgress progress={task.progress} />}
        backLink={back}
        backLinkSmallOnly
      />
      {task.status === 'completed' ? (
        <Infobox variant="info">
          Completed{task.completedAt ? ` on ${formatDateTime(task.completedAt)}` : ''}
          {task.completedBy ? ` by ${task.completedBy}` : ''}. This review is read-only.
        </Infobox>
      ) : (
        <Infobox variant="info">
          The review completes by itself once every active account is decided and both the suspended and removed lists
          are confirmed.
        </Infobox>
      )}
      <ReportDownloads task={task} />
      <Tabs
        prominence='normal'
        selectedKey={tab}
        onSelectionChange={(key) => {
          const next = key as TabId
          setTab(next)
          try {
            sessionStorage.setItem(TAB_KEY + taskId, next)
          } catch {
            // The tab just will not survive a refresh.
          }
        }}
      >
        <TabList aria-label="Account lists">
          {tabs.map(({ id, label }) => (
            <Tab key={id} id={id}>
              {label}
              {counts[id] != null && <CountPill count={counts[id]} />}
            </Tab>
          ))}
        </TabList>
        <TabPanel id="active" className="pt-4">
          <ActiveAccounts task={task} onChanged={reload} />
        </TabPanel>
        <TabPanel id="suspended" className="pt-4">
          <PopulationTab task={task} population="suspended" onChanged={reload} />
        </TabPanel>
        <TabPanel id="removed" className="pt-4">
          <PopulationTab task={task} population="removed" onChanged={reload} />
        </TabPanel>
      </Tabs>
    </section>
  )
}
