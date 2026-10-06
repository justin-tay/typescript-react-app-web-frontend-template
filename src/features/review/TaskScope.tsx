import { Infobox, Spinner } from '@opengovsg/oui'
import type { ReactNode } from 'react'
import { useParams } from 'react-router'
import { getTask, type Task } from './api'
import { useRefetchOnFocus } from './use-refetch-on-focus'
import { ApiError } from '@/shared/lib/api-errors'
import { useResource } from '@/shared/lib/use-resource'
import { PageHeader } from '@/shared/ui/page-header'

/**
 * Loads the task named in the address for the overview and each of its pages, so all of them show the same figures
 * and read them again when the window regains focus. `children` gets the task and a way to read it again after a
 * change.
 */
export function TaskScope({ children }: { children: (task: Task, reload: () => void) => ReactNode }) {
  const { taskId = '' } = useParams()
  const state = useResource(getTask, [taskId])
  useRefetchOnFocus(state.reload)

  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'error') {
    const status = state.error instanceof ApiError ? state.error.status : undefined
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Account review"
          backLink={{ href: '/admin/reviews', label: 'Back to reviews' }}
          backLinkSmallOnly
        />
        <Infobox variant={status === 403 ? 'warning' : 'error'}>
          {status === 404 ? 'This review does not exist.' : state.error.message}
        </Infobox>
      </div>
    )
  }
  return children(state.data, state.reload)
}
