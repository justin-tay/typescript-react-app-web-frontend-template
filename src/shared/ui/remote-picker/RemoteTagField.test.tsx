import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RemoteTagField } from './RemoteTagField'

describe('RemoteTagField', () => {
  it('shows the chosen options as tags and asks the server for matches', async () => {
    const searchOptions = vi.fn().mockResolvedValue({ items: [{ id: 'g2', name: 'Support' }], totalItems: 1 })
    render(
      <RemoteTagField
        label="Groups"
        selected={[{ id: 'g1', name: 'Admins' }]}
        onChange={vi.fn()}
        searchOptions={searchOptions}
      />,
    )

    expect(await screen.findByText('Admins')).toBeInTheDocument()
    await waitFor(() => expect(searchOptions).toHaveBeenCalledWith({ search: '', size: 20 }))
  })

  it('tells the person to keep typing when only part of the matches is shown', async () => {
    const searchOptions = vi.fn().mockResolvedValue({ items: [{ id: 'g2', name: 'Support' }], totalItems: 50 })
    render(<RemoteTagField label="Groups" selected={[]} onChange={vi.fn()} searchOptions={searchOptions} />)

    expect(await screen.findByText('Showing 1 of 50. Keep typing to narrow the list.')).toBeInTheDocument()
  })
})
