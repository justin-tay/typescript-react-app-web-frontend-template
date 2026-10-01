import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '@/shared/session/auth-context'
import { PageHeader } from '@/shared/ui/page-header'
import { AppShell } from './AppShell'

const user = { id: '1', username: 'ada', name: 'Ada Lovelace', roles: [] }

function GoTo({ to }: { to: string }) {
  const navigate = useNavigate()
  return <button onClick={() => void navigate(to)}>Go to {to}</button>
}

function renderShell(navItems?: { href: string; label: string }[]) {
  render(
    <AuthContext
      value={{
        state: { status: 'authenticated', user },
        reload: async () => {},
        signOut: async () => {},
      }}
    >
      <MemoryRouter initialEntries={['/one']}>
        <GoTo to="/two" />
        <Routes>
          <Route element={<AppShell homeHref="/" accountBase="/account" navItems={navItems} navTitle="Manage" />}>
            <Route path="/one" element={<PageHeader title="First page" />} />
            <Route path="/two" element={<PageHeader title="Second page" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

describe('AppShell', () => {
  it('moves focus to the new page heading when the person moves to another page', async () => {
    renderShell()
    expect(screen.getByRole('heading', { name: 'First page' })).not.toHaveFocus()

    await userEvent.click(screen.getByRole('button', { name: 'Go to /two' }))

    expect(screen.getByRole('heading', { name: 'Second page' })).toHaveFocus()
  })

  it('names its navigation landmarks so they can be told apart', () => {
    renderShell([{ href: '/one', label: 'One' }])

    const names = screen.getAllByRole('navigation', { hidden: true }).map((nav) => nav.getAttribute('aria-label'))
    expect(names).toEqual(expect.arrayContaining(['Site', 'Manage']))
  })

  it('offers a link that skips to the main content', () => {
    renderShell()

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })

  describe('navigation drawer', () => {
    const items = [{ href: '/one', label: 'One' }]

    it('opens as a modal dialog and closes with Escape, returning focus to the menu button', async () => {
      renderShell(items)
      const button = screen.getByRole('button', { name: 'Open navigation' })

      await userEvent.click(button)
      const dialog = await screen.findByRole('dialog', { name: 'Manage' })
      expect(dialog).toContainElement(screen.getAllByRole('link', { name: 'One' })[0])

      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(button).toHaveFocus())
    })

    it('closes when the person follows a link in it', async () => {
      renderShell(items)
      await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
      await screen.findByRole('dialog', { name: 'Manage' })

      await userEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'One' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
  })
})
