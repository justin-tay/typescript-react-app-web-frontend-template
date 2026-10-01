import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/lib/api-errors'
import { LoadError } from './LoadError'

describe('LoadError', () => {
  it('offers to try again, and to clear the filters when the page can', async () => {
    const onRetry = vi.fn()
    const onClearFilters = vi.fn()
    render(<LoadError error={new ApiError('boom', 500)} onRetry={onRetry} onClearFilters={onClearFilters} />)

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })

  it('says the service is unavailable for a gateway failure', () => {
    render(<LoadError error={new ApiError('bad gateway', 502)} onRetry={() => {}} />)

    expect(screen.getByText('Service unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear search and filters' })).not.toBeInTheDocument()
  })

  it('explains a refusal instead of offering a retry that cannot help', () => {
    render(<LoadError error={new ApiError('You do not have permission to do this.', 403)} onRetry={() => {}} />)

    expect(screen.getByText('You do not have permission to do this.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
