import { render, screen } from '@testing-library/react'
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

function renderShell() {
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
          <Route element={<AppShell homeHref="/" accountBase="/account" />}>
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

  it('offers a link that skips to the main content', () => {
    renderShell()

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })
})
