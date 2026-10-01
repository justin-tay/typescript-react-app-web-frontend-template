import { Button, Infobox } from '@opengovsg/oui'
import { ApiError, failureKind } from '@/shared/lib/api-errors'
import { ServiceUnavailable } from '@/shared/ui/service-unavailable'

export interface LoadErrorProps {
  error: Error
  /** Tries the load again. */
  onRetry: () => void
  /** For a list: forgets the search, filters and sort, in case a restored one is what fails. */
  onClearFilters?: () => void
}

/**
 * What a page shows when its data could not be loaded. A refusal (403) is explained, since trying
 * again will not help; anything else gets the shared notice with a retry, and a list can also offer
 * to clear its filters, because a view restored after a refresh keeps them.
 */
export function LoadError({ error, onRetry, onClearFilters }: LoadErrorProps) {
  if (error instanceof ApiError && error.status === 403) {
    return <Infobox variant="warning">{error.message}</Infobox>
  }
  return (
    <div className="flex flex-col gap-4">
      <ServiceUnavailable kind={failureKind(error)} onRetry={onRetry} />
      {onClearFilters && (
        <div>
          <Button variant="clear" onPress={onClearFilters}>
            Clear search and filters
          </Button>
        </div>
      )}
    </div>
  )
}
