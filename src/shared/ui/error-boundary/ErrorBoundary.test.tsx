import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

let shouldThrow = true

function Broken() {
  if (shouldThrow) throw new Error('boom')
  return <p>All fine</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true
    // React logs a caught render error to the console; keep the test output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows a notice instead of a blank page, and leaves what is outside it alone', () => {
    render(
      <div>
        <nav>Navigation</nav>
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>
      </div>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.queryByText('boom')).not.toBeInTheDocument()
  })

  it('logs the error for developers', () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    expect(console.error).toHaveBeenCalledWith('A page failed to render.', expect.any(Error), expect.any(String))
  })

  it('tries again when asked', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
    shouldThrow = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('All fine')).toBeInTheDocument()
    rerender(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    )
  })

  it('clears when the reset key changes, as it does when moving to another page', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    shouldThrow = false
    rerender(
      <ErrorBoundary resetKey="/b">
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByText('All fine')).toBeInTheDocument()
  })

  it('stays on the notice when the key is unchanged', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Broken />
      </ErrorBoundary>,
    )
    shouldThrow = false
    rerender(
      <ErrorBoundary resetKey="/a">
        <Broken />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
