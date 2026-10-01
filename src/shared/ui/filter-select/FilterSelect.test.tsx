import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterSelect } from './FilterSelect'

const options = [
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
]

describe('FilterSelect', () => {
  it('shows "All" when there is no filter and the chosen option when there is one', () => {
    const { rerender } = render(<FilterSelect label="Status" value={undefined} onChange={vi.fn()} options={options} />)
    expect(screen.getByRole('button', { name: /Status/ })).toHaveTextContent('All')

    rerender(<FilterSelect label="Status" value="suspended" onChange={vi.fn()} options={options} />)
    expect(screen.getByRole('button', { name: /Status/ })).toHaveTextContent('Suspended')
  })

  it('reports the chosen option, and an empty string for "All" so the filter is cleared', async () => {
    const onChange = vi.fn()
    render(<FilterSelect label="Status" value="active" onChange={onChange} options={options} />)

    await userEvent.click(screen.getByRole('button', { name: /Status/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Suspended' }))
    expect(onChange).toHaveBeenLastCalledWith('suspended')

    await userEvent.click(screen.getByRole('button', { name: /Status/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'All' }))
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('lists "All" first, followed by the options', async () => {
    render(<FilterSelect label="Status" value="" onChange={vi.fn()} options={options} allLabel="Everything" />)

    await userEvent.click(screen.getByRole('button', { name: /Status/ }))

    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      'Everything',
      'Active',
      'Suspended',
    ])
  })
})
