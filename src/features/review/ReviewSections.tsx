import { ActiveAccounts } from './ActiveAccounts'
import type { Population } from './api'
import { PopulationList } from './PopulationList'
import { ReviewProgress } from './ReviewProgress'
import { TaskScope } from './TaskScope'
import { TaskStatusBadge } from './TaskStatusBadge'
import { PageHeader } from '@/shared/ui/page-header'

const back = (taskId: string) => ({ href: `/admin/reviews/${encodeURIComponent(taskId)}`, label: 'Back to the review' })

/** The page for deciding the active accounts. */
export function ActiveAccountsPage() {
  return (
    <TaskScope>
      {(task, reload) => (
        <section className="flex flex-col gap-6">
          <PageHeader
            title="Active accounts"
            badge={<TaskStatusBadge task={task} />}
            subtitle="Tick the accounts that are correct and confirm them. For any that are not, take a role away or remove the account."
            actions={<ReviewProgress progress={task.progress} />}
            backLink={back(task.id)}
            backLinkSmallOnly
          />
          <ActiveAccounts task={task} onChanged={reload} />
        </section>
      )}
    </TaskScope>
  )
}

const TITLES: Record<Population, string> = { suspended: 'Suspended accounts', removed: 'Removed accounts' }

/** The page for checking and confirming the suspended or the removed list. */
export function PopulationPage({ population }: { population: Population }) {
  return (
    <TaskScope>
      {(task, reload) => (
        <section className="flex flex-col gap-6">
          <PageHeader
            title={TITLES[population]}
            badge={<TaskStatusBadge task={task} />}
            subtitle={`These accounts were ${population} since the last review, by the system or by an administrator. Please review a few records to check the list looks complete and correct, then confirm it.`}
            backLink={back(task.id)}
            backLinkSmallOnly
          />
          <PopulationList task={task} population={population} onChanged={reload} />
        </section>
      )}
    </TaskScope>
  )
}
