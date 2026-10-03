import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '@/shared/lib/api-errors'
import { activeReauthForm } from '@/shared/session/reauth'
import { saveReauthDraft } from '@/shared/session/reauth-stash'
import type { AppUser } from './api'
import { UserFormModal } from './UserFormModal'

const createUser = vi.fn()
const updateUser = vi.fn()
vi.mock('./api', () => ({
  createUser: (...args: unknown[]) => createUser(...args),
  updateUser: (...args: unknown[]) => updateUser(...args),
}))
vi.mock('./remote-options', () => ({ searchGroups: () => Promise.resolve({ items: [], totalItems: 0 }) }))
vi.mock('@/shared/session/auth-context', () => {
  const user = { id: 'u1', username: 'admin', name: 'Admin', roles: ['ROLE_GROUP_MANAGE'] }
  return { useCurrentUser: () => user, useAuth: () => ({ state: { status: 'authenticated', user } }) }
})

const onSaved = vi.fn()

/** Stands in for the page that owns the modal, as `AdminUsers` does. */
function Page() {
  const [editing, setEditing] = useState<AppUser | null | undefined>(undefined)
  return (
    <>
      <button onClick={() => setEditing(null)}>New user</button>
      <UserFormModal
        isOpen={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        user={editing ?? null}
        onReopen={setEditing}
        onSaved={onSaved}
      />
    </>
  )
}

describe('UserFormModal and signing in again', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('offers what has been typed so far to be kept, only while it is open', async () => {
    render(<Page />)
    expect(activeReauthForm()).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'New user' }))
    await userEvent.type(await screen.findByLabelText(/Username/), 'ada')
    await userEvent.type(screen.getByLabelText(/Name/), 'Ada')
    expect(activeReauthForm()?.key).toBe('admin-user-form')
    expect(activeReauthForm()?.getDraft()).toMatchObject({ user: null, username: 'ada', name: 'Ada' })
  })

  it('reopens with what was typed and submits it once the person is back', async () => {
    createUser.mockResolvedValue(undefined)
    saveReauthDraft({
      key: 'admin-user-form',
      userId: 'u1',
      draft: { user: null, username: 'ada', name: 'Ada', email: 'ada@example.com', groups: [] },
    })
    render(<Page />)
    await vi.waitFor(() =>
      expect(createUser).toHaveBeenCalledWith({
        username: 'ada',
        name: 'Ada',
        email: 'ada@example.com',
        groupIds: [],
      }),
    )
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays open with the errors and says the change was not saved when it is refused', async () => {
    createUser.mockRejectedValue(new ValidationError('Invalid', { username: 'Already taken.' }))
    saveReauthDraft({
      key: 'admin-user-form',
      userId: 'u1',
      draft: { user: null, username: 'ada', name: 'Ada', email: 'ada@example.com', groups: [] },
    })
    render(<Page />)
    expect(await screen.findByText(/your change couldn't be saved/)).toBeInTheDocument()
    expect(screen.getByText('Already taken.')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('shows a groups error next to the groups field', async () => {
    createUser.mockRejectedValue(new ValidationError('Invalid', { groupIds: 'must not be empty' }))
    saveReauthDraft({
      key: 'admin-user-form',
      userId: 'u1',
      draft: { user: null, username: 'ada', name: 'Ada', email: 'ada@example.com', groups: [] },
    })
    render(<Page />)
    expect(await screen.findByText('must not be empty')).toBeInTheDocument()
  })
})
