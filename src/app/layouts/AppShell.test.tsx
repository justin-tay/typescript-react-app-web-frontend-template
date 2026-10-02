import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
        expireSession: async () => {},
      }}
    >
      <MemoryRouter initialEntries={['/one']}>
        <GoTo to="/two" />
        <Routes>
          <Route
            element={<AppShell homeHref="/" accountBase="/account" navItems={navItems} navLabel="Administration" />}
          >
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
    expect(names).toEqual(expect.arrayContaining(['Site', 'Administration']))
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
      const dialog = await screen.findByRole('dialog', { name: 'Administration' })
      expect(dialog).toContainElement(screen.getAllByRole('link', { name: 'One' })[0])

      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(button).toHaveFocus())
    })

    it('closes when the person follows a link in it', async () => {
      renderShell(items)
      await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
      await screen.findByRole('dialog', { name: 'Administration' })

      await userEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'One' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('stays open when the link is opened elsewhere with a Ctrl or Cmd click', async () => {
      renderShell(items)
      await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
      const link = within(await screen.findByRole('dialog', { name: 'Administration' })).getByRole('link', {
        name: 'One',
      })

      fireEvent.click(link, { ctrlKey: true })
      fireEvent.click(link, { metaKey: true })

      expect(screen.getByRole('dialog', { name: 'Administration' })).toBeInTheDocument()
    })

    describe('when the window grows past the large breakpoint', () => {
      afterEach(() => vi.unstubAllGlobals())

      /** A stand-in for `matchMedia` whose single query the test can flip. */
      function stubMatchMedia() {
        const listeners = new Set<(event: { matches: boolean }) => void>()
        vi.stubGlobal('matchMedia', () => ({
          matches: false,
          addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => listeners.add(listener),
          removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
            listeners.delete(listener),
        }))
        return (matches: boolean) => act(() => listeners.forEach((listener) => listener({ matches })))
      }

      it('closes, so the page is not left locked behind a hidden drawer', async () => {
        const resizeTo = stubMatchMedia()
        renderShell(items)
        await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
        await screen.findByRole('dialog', { name: 'Administration' })

        resizeTo(true)

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      })

      it('stays open while the window is still small', async () => {
        const resizeTo = stubMatchMedia()
        renderShell(items)
        await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
        await screen.findByRole('dialog', { name: 'Administration' })

        resizeTo(false)

        expect(screen.getByRole('dialog', { name: 'Administration' })).toBeInTheDocument()
      })
    })
  })
})
