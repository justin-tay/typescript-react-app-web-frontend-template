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

describe('PageHeader tab title', () => {
  it('sets the browser title to the page and the app name, and restores the app name when it goes', () => {
    const { unmount } = render(<PageHeader title="Users" />)
    expect(document.title).toBe('Users - MyService')

    unmount()
    expect(document.title).toBe('MyService')
  })

  it('leaves the app name alone when the title is not plain text', () => {
    render(<PageHeader title={<em>Ada</em>} />)

    expect(document.title).toBe('MyService')
  })
})
