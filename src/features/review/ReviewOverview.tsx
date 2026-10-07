import { Badge, Infobox, Link } from '@opengovsg/oui'
import { ArrowRight, Trash2, UserCheck, UserX } from 'lucide-react'
import type { ReactNode } from 'react'
import { countPopulation, type Task } from './api'
import { ReportDownloads } from './ReportDownloads'
import { ReviewProgress } from './ReviewProgress'
import { TaskScope } from './TaskScope'
import { TaskStatusBadge } from './TaskStatusBadge'
import { formatDate, formatDateTime } from '@/shared/lib/format'
import { humanize } from '@/shared/lib/labels'
import { useResource } from '@/shared/lib/use-resource'
import { PageHeader } from '@/shared/ui/page-header'

const BUTTON =
  'inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-sm bg-interaction-main-default px-4 py-2 font-medium text-base-content-inverse hover:bg-interaction-main-hover hover:text-base-content-inverse hover:no-underline'
const BUTTON_QUIET =
  'inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-sm border border-base-divider-strong px-4 py-2 font-medium hover:no-underline'

const completedBy = (user?: string | null) => (user === 'system' ? 'the system' : user)

/** One part of the review: what it is, how far along, and the way into it. */
function SectionCard({
  icon,
  title,
  purpose,
  isDone,
  children,
  href,
  action,
}: {
  icon: ReactNode
  title: string
  purpose: string
  /** Every account in this part is reviewed, or its list is confirmed. An open part is emphasised, a done one is quiet. */
  isDone: boolean
  children: ReactNode
  href: string
  action: string
}) {
  return (
    <section
      aria-label={title}
      className={[
        'flex flex-col gap-4 rounded-lg border bg-base-canvas-default p-6',
        isDone ? 'border-base-divider-medium' : 'border-interaction-main-default',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden="true" className="text-base-content-medium">
          {icon}
        </span>
        <Badge color={isDone ? 'success' : 'main'}>{isDone ? 'Reviewed' : 'Open'}</Badge>
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-base-content-strong">{title}</h2>
        <p className="text-sm text-base-content-medium">{purpose}</p>
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
      <Link href={href} className={isDone ? BUTTON_QUIET : BUTTON}>
        {action}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  )
}

/** The removed card: how many accounts are on the list now, and whether it is confirmed. */
function RemovedFigures({ task }: { task: Task }) {
  const status = task.removed
  const live = useResource(countPopulation, [task.id, 'removed'], { enabled: !status.confirmed })
  const count = status.confirmed ? status.count : live.status === 'loaded' ? live.data : null
  return (
    <>
      <p className="text-3xl font-semibold text-base-content-strong">
        {count != null ? count.toLocaleString() : '-'}
        <span className="ml-2 text-base font-normal text-base-content-medium">accounts</span>
      </p>
      {status.confirmed ? (
        <p className="text-sm">
          Confirmed by {status.confirmedBy}
          {status.confirmedAt ? ` on ${formatDateTime(status.confirmedAt)}` : ''}
          {status.note ? '. With remarks.' : ''}
        </p>
      ) : (
        <p className="text-sm text-base-content-medium">
          {task.status === 'open' ? 'Waiting for your confirmation' : 'Not confirmed'}
        </p>
      )}
    </>
  )
}

/** One review task: where it stands in each of its three parts, how to do them, and the report. */
export function ReviewOverview() {
  return <TaskScope>{(task) => <Overview task={task} />}</TaskScope>
}

function Overview({ task }: { task: Task }) {
  const isOpen = task.status === 'open'
  const activeLeft = task.active.progress.total - task.active.progress.reviewed
  const suspendedLeft = task.suspended.progress.total - task.suspended.progress.reviewed
  const left = activeLeft + suspendedLeft
  const done = [activeLeft === 0, suspendedLeft === 0, task.removed.confirmed]
  const doneCount = done.filter(Boolean).length
  const base = `/admin/reviews/${encodeURIComponent(task.id)}`
  const verb = isOpen ? 'Review' : 'View'

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={humanize(task.type)}
        badge={<TaskStatusBadge task={task} />}
        subtitle={`${formatDate(task.startDate)} to ${formatDate(task.dueDate)}`}
        actions={<ReportDownloads task={task} />}
        backLink={{ href: '/admin/reviews', label: 'Back to reviews' }}
        backLinkSmallOnly
      />
      {isOpen ? (
        <Infobox variant="info">
          {doneCount === 3
            ? 'Everything is done. The review will close and its report will be stored.'
            : `${doneCount} of 3 parts done. ${left === 0 ? 'All' : left.toLocaleString()} active or suspended ${left === 1 ? 'account' : 'accounts'} ${left === 0 ? 'reviewed' : 'still to review'}.`}
        </Infobox>
      ) : (
        <Infobox variant="info">
          Completed{task.completedAt ? ` on ${formatDateTime(task.completedAt)}` : ''}
          {task.completedBy ? ` by ${completedBy(task.completedBy)}` : ''}. This review is read-only.
        </Infobox>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          icon={<UserCheck size={28} />}
          title="Active accounts"
          purpose="Check each account and its roles. Confirm the correct ones. Take roles away or remove the rest."
          isDone={done[0]}
          href={`${base}/active`}
          action={`${verb} active accounts`}
        >
          <p className="text-3xl font-semibold text-base-content-strong">
            {task.active.progress.total.toLocaleString()}
            <span className="ml-2 text-base font-normal text-base-content-medium">accounts</span>
          </p>
          <ReviewProgress progress={task.active.progress} />
        </SectionCard>
        <SectionCard
          icon={<UserX size={28} />}
          title="Suspended accounts"
          purpose="Check each account suspended since the last review, and why. Confirm the correct ones. Take roles away or remove the rest."
          isDone={done[1]}
          href={`${base}/suspended`}
          action={`${verb} suspended accounts`}
        >
          <p className="text-3xl font-semibold text-base-content-strong">
            {task.suspended.progress.total.toLocaleString()}
            <span className="ml-2 text-base font-normal text-base-content-medium">accounts</span>
          </p>
          <ReviewProgress progress={task.suspended.progress} />
        </SectionCard>
        <SectionCard
          icon={<Trash2 size={28} />}
          title="Removed accounts"
          purpose="Review a few of the accounts removed since the last review."
          isDone={done[2]}
          href={`${base}/removed`}
          action={`${verb} removed accounts`}
        >
          <RemovedFigures task={task} />
        </SectionCard>
      </div>
      <section className="flex flex-col gap-3 rounded-lg bg-base-canvas-alt p-6">
        <h2 className="text-lg font-semibold text-base-content-strong">Review instructions</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>
            <strong>Active accounts:</strong> Check each person and the roles they hold. Tick the accounts that are
            correct and confirm them. Take roles away or remove the account where needed.
          </li>
          <li>
            <strong>Suspended accounts:</strong> Check each person, who suspended them and why. Tick the accounts that
            are correct and confirm them. Take roles away or remove the account where needed.
          </li>
          <li>
            <strong>Removed accounts:</strong> Review a few records from the list, including who removed them and why.
            You do not need to check every account. Then confirm the list.
          </li>
          <li>
            The review closes by itself once every active and suspended account is reviewed and the removed list is
            confirmed. Its report is then stored as the record.
          </li>
        </ol>
      </section>
    </section>
  )
}
