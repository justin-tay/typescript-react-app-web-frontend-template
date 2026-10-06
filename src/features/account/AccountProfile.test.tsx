import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { LoginUser } from '@/shared/session/api'
import { AuthContext } from '@/shared/session/auth-context'
import { AccountProfile } from './AccountProfile'

function renderFor(user: LoginUser) {
  render(
    <AuthContext
      value={{
        state: { status: 'authenticated', user },
        reload: async () => {},
        signOut: async () => {},
        expireSession: async () => {},
      }}
    >
      <MemoryRouter>
        <AccountProfile />
      </MemoryRouter>
    </AuthContext>,
  )
}

const ada: LoginUser = {
  id: 'internal-id-123',
  username: 'ada',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  permissions: ['user:read', 'review:decide'],
}

describe('AccountProfile', () => {
  it('shows the name, email and username as labelled details', () => {
    renderFor(ada)

    expect(screen.getByRole('heading', { name: 'Personal info' })).toBeInTheDocument()
    expect(screen.getByText('Name').nextElementSibling).toHaveTextContent('Ada Lovelace')
    expect(screen.getByText('Email').nextElementSibling).toHaveTextContent('ada@example.com')
    expect(screen.getByText('Username').nextElementSibling).toHaveTextContent('ada')
  })

  it('does not show the internal id', () => {
    renderFor(ada)

    expect(screen.queryByText('internal-id-123')).not.toBeInTheDocument()
  })

  it('says why the details cannot be edited', () => {
    renderFor(ada)

    expect(screen.getByText(/can't be changed here/)).toBeInTheDocument()
  })

  it('lists the permissions in words, not as raw names', () => {
    renderFor(ada)

    const roles = within(screen.getByRole('list', { name: 'Your permissions' }))
    expect(roles.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['User: read', 'Review: decide'])
    expect(screen.queryByText('user:read')).not.toBeInTheDocument()
  })

  it('says so when there are no permissions, and when there is no email', () => {
    renderFor({ ...ada, email: undefined, permissions: [] })

    expect(screen.getByText('You have no administration permissions.')).toBeInTheDocument()
    expect(screen.getByText('Email').nextElementSibling).toHaveTextContent('Not set')
  })
})
