import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

describe('PageHeader back link', () => {
  const backLink = { href: '/users', label: 'Back to users' }

  it('is shown at every size by default', () => {
    render(<PageHeader title="Ada" backLink={backLink} />)

    expect(screen.getByRole('link', { name: /Back to users/ })).not.toHaveClass('lg:hidden')
  })

  it('can be limited to small screens, where the shell shows no breadcrumb', () => {
    render(<PageHeader title="Ada" backLink={backLink} backLinkSmallOnly />)

    expect(screen.getByRole('link', { name: /Back to users/ })).toHaveClass('lg:hidden')
  })
})

describe('PageHeader tab title', () => {
  // index.html's own title: the tab shows it before the app loads and whenever no page sets one. Only
  // this element is removed afterwards, so React's own title node is left for it to clean up.
  let staticTitle: HTMLTitleElement
  beforeEach(() => {
    staticTitle = document.createElement('title')
    staticTitle.textContent = 'MyService'
    document.head.append(staticTitle)
  })
  afterEach(() => {
    staticTitle.remove()
  })

  it('sets the browser title to the page and the app name, and goes back to the app name when it goes', () => {
    const { unmount } = render(<PageHeader title="Users" />)
    expect(document.title).toBe('Users - MyService')

    unmount()
    expect(document.title).toBe('MyService')
  })

  it('follows the page as the title changes', () => {
    const { rerender } = render(<PageHeader title="Users" />)

    rerender(<PageHeader title="Groups" />)

    expect(document.title).toBe('Groups - MyService')
  })

  it('leaves the app name alone when the title is not plain text', () => {
    render(<PageHeader title={<em>Ada</em>} />)

    expect(document.title).toBe('MyService')
  })
})
