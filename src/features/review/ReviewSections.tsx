import { ActiveAccounts } from './ActiveAccounts'
import type { ItemCategory } from './api'
import { PopulationList } from './PopulationList'
import { ReviewProgress } from './ReviewProgress'
import { TaskScope } from './TaskScope'
import { TaskStatusBadge } from './TaskStatusBadge'
import { PageHeader } from '@/shared/ui/page-header'

const back = (taskId: string) => ({ href: `/admin/reviews/${encodeURIComponent(taskId)}`, label: 'Back to the review' })

const CATEGORY_PAGES: Record<ItemCategory, { title: string; subtitle: string }> = {
  active: {
    title: 'Active accounts',
    subtitle:
      'Tick the accounts that are correct and confirm them. For any that are not, take a role away or remove the account.',
  },
  suspended: {
    title: 'Suspended accounts',
    subtitle:
      'These accounts were suspended since the last review. Check why each was suspended. Tick the ones that are correct and confirm them. For any that are not, take a role away or remove the account.',
  },
}

/** The page for deciding the accounts of a category, one by one. */
export function AccountsPage({ category }: { category: ItemCategory }) {
  const { title, subtitle } = CATEGORY_PAGES[category]
  return (
    <TaskScope>
      {(task, reload) => (
        <section className="flex flex-col gap-6">
          <PageHeader
            title={title}
            badge={<TaskStatusBadge task={task} />}
            subtitle={subtitle}
            actions={<ReviewProgress progress={task[category].progress} />}
            backLink={back(task.id)}
            backLinkSmallOnly
          />
          <ActiveAccounts task={task} category={category} onChanged={reload} />
        </section>
      )}
    </TaskScope>
  )
}

/** The page for checking and confirming the removed list. */
export function PopulationPage() {
  return (
    <TaskScope>
      {(task, reload) => (
        <section className="flex flex-col gap-6">
          <PageHeader
            title="Removed accounts"
            badge={<TaskStatusBadge task={task} />}
            subtitle="These accounts were removed since the last review, by the system or by an administrator. Please review a few records to check the list looks complete and correct, then confirm it."
            backLink={back(task.id)}
            backLinkSmallOnly
          />
          <PopulationList task={task} onChanged={reload} />
        </section>
      )}
    </TaskScope>
  )
}
