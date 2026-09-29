import { Button, Infobox } from '@opengovsg/oui'
import type { FailureKind } from '@/shared/lib/api-errors'

export interface ServiceUnavailableProps {
  kind: FailureKind
  onRetry: () => void
  /** Stretch the button to the notice's width, for a narrow card of full-width buttons. */
  fullWidthButton?: boolean
  className?: string
}

const COPY: Record<FailureKind, { variant: 'warning' | 'error'; title: string; body: string }> = {
  unavailable: {
    variant: 'warning',
    title: 'Service unavailable',
    body: 'This service is temporarily unavailable. Please try again in a few minutes.',
  },
  failed: {
    variant: 'error',
    title: 'Something went wrong',
    body: 'We could not complete your request. Please try again.',
  },
}

/** Friendly notice for a page that cannot load because the backend is down or failed. */
export function ServiceUnavailable({ kind, onRetry, fullWidthButton, className }: ServiceUnavailableProps) {
  const { variant, title, body } = COPY[kind]
  return (
    <div className={['flex flex-col gap-4', fullWidthButton ? '' : 'items-start', className].filter(Boolean).join(' ')}>
      <Infobox variant={variant} className="w-full">
        <p className="font-semibold">{title}</p>
        <p>{body}</p>
      </Infobox>
      <Button
        variant="outline"
        size={fullWidthButton ? 'lg' : undefined}
        className={fullWidthButton ? 'w-full' : undefined}
        onPress={onRetry}
      >
        Try again
      </Button>
    </div>
  )
}
