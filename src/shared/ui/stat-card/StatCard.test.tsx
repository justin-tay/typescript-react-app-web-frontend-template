import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('shows the label and the figure', () => {
    render(<StatCard label="Total users" value={1234} />)

    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('shows a spinner while loading and a plain notice when the figure is unavailable', () => {
    const { rerender } = render(<StatCard label="Groups" value="loading" />)
    expect(screen.getByLabelText('Loading Groups')).toBeInTheDocument()

    rerender(<StatCard label="Groups" value="unavailable" />)
    expect(screen.getByText('Not available')).toBeInTheDocument()
  })

  it('is a button only when it has something to open', async () => {
    const onPress = vi.fn()
    const { rerender } = render(<StatCard label="Groups" value={2} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    rerender(<StatCard label="Groups" value={2} onPress={onPress} />)
    await userEvent.click(screen.getByRole('button', { name: /Groups/ }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
