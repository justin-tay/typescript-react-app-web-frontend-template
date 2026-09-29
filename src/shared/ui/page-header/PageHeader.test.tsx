import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('shows the title, subtitle, badge and actions', () => {
    render(
      <PageHeader title="Users" subtitle="Manage users." badge={<span>Pending</span>} actions={<button>New</button>} />,
    )

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByText('Manage users.')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
  })

  it('links back to the list it came from', () => {
    render(<PageHeader title="Ada" backLink={{ href: '/users', label: 'Back to users' }} />)

    expect(screen.getByRole('link', { name: /Back to users/ })).toHaveAttribute('href', '/users')
  })
})
