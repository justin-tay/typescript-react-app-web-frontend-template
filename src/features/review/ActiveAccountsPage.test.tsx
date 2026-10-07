import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewItem } from './api'
import { category, item, renderAt, stubApi, task } from './test-helpers'

const conflict = () =>
  new Response(JSON.stringify({ title: 'Conflict', status: 409, detail: 'Items already decided: i1' }), {
    status: 409,
    headers: { 'Content-Type': 'application/problem+json' },
  })

const tickFirstRow = async () => userEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[1])

describe('active accounts page', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.cookie = 'XSRF-TOKEN=abc'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows what to do, the progress and the accounts with their status', async () => {
    stubApi({
      task: task({ active: category(1, 2) }),
      items: [
        item(),
        item({
          id: 'i2',
          username: 'mlim',
          name: 'Mary Lim',
          outcome: 'confirmed_roles_edited',
          remark: 'Added Viewers',
          lastLoginAt: '2026-08-26T00:00:00Z',
          decidedAt: '2026-09-10T00:00:00Z',
        }),
      ],
    })
    renderAt('/admin/reviews/t1/active')

    expect(await screen.findByRole('heading', { name: 'Active accounts' })).toBeInTheDocument()
    expect(screen.getByText(/Tick the accounts that are correct/)).toBeInTheDocument()
    expect(screen.getByText('1 / 2 reviewed (50%)')).toBeInTheDocument()
    expect((await screen.findAllByText('John Tan')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Not reviewed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Confirmed (Roles Edited)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Added Viewers').length).toBeGreaterThan(0)
    // The figure stops at the decision, so a reviewed row does not keep growing.
    expect(screen.getByRole('columnheader', { name: 'Days inactive' })).toBeInTheDocument()
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
    expect(screen.getAllByText('at review').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Never signed in').length).toBeGreaterThan(0)
  })

  it('offers Edit Roles and Remove on a row and no per-row Confirm, nothing on a reviewed row', async () => {
    stubApi({ items: [item(), item({ id: 'i2', username: 'mlim', name: 'Mary Lim', outcome: 'confirmed' })] })
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')

    expect(screen.getAllByRole('button', { name: 'Edit roles of jtan' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Remove jtan' }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Confirm jtan' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove mlim' })).toBeNull()
  })

  it('disables every action on your own account and says why', async () => {
    stubApi({ items: [item({ ownAccount: true })] })
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')

    for (const name of ['Edit roles of jtan', 'Remove jtan']) {
      for (const button of screen.getAllByRole('button', { name })) expect(button).toBeDisabled()
    }
    expect(screen.getAllByText('You cannot review your own account.').length).toBeGreaterThan(0)
  })

  it('does not let a reviewed or own account be ticked', async () => {
    stubApi({
      items: [
        item({ outcome: 'confirmed' }),
        item({ id: 'i2', username: 'rachel', name: 'Rachel Lim', ownAccount: true }),
      ],
    })
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')

    const [, ...rows] = within(screen.getByRole('table')).getAllByRole('checkbox')
    for (const box of rows) expect(box).toBeDisabled()
  })

  it('counts the ticked accounts and confirms them in one decision after a confirmation', async () => {
    const calls = stubApi({ items: [item(), item({ id: 'i2', userId: 'u2', username: 'mlim', name: 'Mary Lim' })] })
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')
    expect(screen.getByRole('button', { name: 'Confirm selected as reviewed' })).toBeDisabled()
    expect(screen.getByText('Select accounts to confirm them')).toBeInTheDocument()

    const table = within(screen.getByRole('table'))
    await userEvent.click(table.getAllByRole('checkbox')[1])
    await userEvent.click(table.getAllByRole('checkbox')[2])
    expect(screen.getByText('2 accounts selected')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed' }))
    expect(calls.some(({ key }) => key.startsWith('POST'))).toBe(false)
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))

    await waitFor(() =>
      expect(calls).toContainEqual({
        key: 'POST /api/account-reviews/tasks/t1/decisions',
        body: { itemIds: ['i1', 'i2'], decision: 'confirm' },
      }),
    )
  })

  it('removes one account with a reason, after showing whose account it is', async () => {
    const calls = stubApi()
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove jtan' })[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Are you sure you want to remove this account?')).toBeInTheDocument()
    expect(within(dialog).getByText('John Tan')).toBeInTheDocument()
    const submit = within(dialog).getByRole('button', { name: 'Remove account' })
    expect(submit).toBeDisabled()
    await userEvent.click(within(dialog).getByRole('button', { name: /Reason/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Left the organisation' }))
    await userEvent.click(submit)

    await waitFor(() =>
      expect(calls).toContainEqual({
        key: 'POST /api/account-reviews/tasks/t1/decisions',
        body: { itemIds: ['i1'], decision: 'remove', reasonCode: 'left_organisation' },
      }),
    )
  })

  it('says someone else may have got there first when the server refuses a batch', async () => {
    stubApi({ writes: { 'POST /api/account-reviews/tasks/t1/decisions': conflict() } })
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')

    await tickFirstRow()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText(/Someone else may have reviewed these accounts already/)).toBeInTheDocument()
  })

  it('forgets the ticked rows when the search changes, since they may no longer be in view', async () => {
    stubApi()
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')
    await tickFirstRow()
    expect(screen.getByText('1 account selected')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search accounts' }), 'kumar')

    expect(await screen.findByText('Select accounts to confirm them')).toBeInTheDocument()
  })

  it('does not show a refused decision again when the dialog is closed and opened', async () => {
    stubApi({ writes: { 'POST /api/account-reviews/tasks/t1/decisions': conflict() } })
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')
    await tickFirstRow()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))
    await screen.findByText(/already decided/)

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed' }))

    await screen.findByRole('dialog')
    expect(screen.queryByText(/already decided/)).not.toBeInTheDocument()
  })

  it('is read-only once completed', async () => {
    stubApi({
      task: task({ status: 'completed', active: category(1, 1) }),
      items: [item({ outcome: 'confirmed' })],
    })
    renderAt('/admin/reviews/t1/active')
    await screen.findAllByText('John Tan')

    expect(screen.queryByRole('button', { name: 'Confirm selected as reviewed' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove jtan' })).toBeNull()
    expect(within(screen.getByRole('table')).queryAllByRole('checkbox')).toHaveLength(0)
  })

  describe('edit roles', () => {
    const open = async (roles: string[]) => {
      const calls = stubApi({
        items: [item({ roles, currentRoles: roles.map((name, i) => ({ id: `r${i + 1}`, name })) })] as ReviewItem[],
      })
      renderAt('/admin/reviews/t1/active')
      await screen.findAllByText('John Tan')
      await userEvent.click(screen.getAllByRole('button', { name: 'Edit roles of jtan' })[0])
      return { calls, dialog: await screen.findByRole('dialog') }
    }

    it('shows who is edited, and cannot save until something changes', async () => {
      const { dialog } = await open(['Users'])
      expect(within(dialog).getByText('John Tan')).toBeInTheDocument()
      expect(await within(dialog).findByRole('combobox', { name: /Roles to keep/ })).toBeInTheDocument()
      expect(within(dialog).getByText('Users')).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Save and confirm' })).toBeDisabled()
    })

    it('saves the roles that are kept', async () => {
      const { calls, dialog } = await open(['Users', 'Viewers'])
      await userEvent.click(await within(dialog).findByRole('button', { name: 'toggle menu' }))
      await userEvent.click(await screen.findByRole('option', { name: 'Viewers' }))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save and confirm' }))

      await waitFor(() =>
        expect(calls).toContainEqual({
          key: 'PUT /api/account-reviews/tasks/t1/items/i1/roles',
          body: { roleIds: ['r1'] },
        }),
      )
    })

    it('is not offered without the permission to take a role away', async () => {
      stubApi()
      renderAt('/admin/reviews/t1/active', ['review:read', 'review:decide', 'user:remove'])
      await screen.findAllByText('John Tan')

      expect(screen.queryByRole('button', { name: 'Edit roles of jtan' })).toBeNull()
      expect(screen.getAllByRole('button', { name: 'Remove jtan' }).length).toBeGreaterThan(0)
    })
  })

  it('reviews suspended accounts like active ones, with why each was suspended', async () => {
    const calls = stubApi({
      items: [
        item({
          createdAt: '2025-03-04T00:00:00Z',
          suspension: { at: '2026-09-01T00:00:00Z', by: 'system', reasonCode: 'inactive_account' },
        }),
      ],
    })
    renderAt('/admin/reviews/t1/suspended')

    expect(await screen.findByRole('heading', { name: 'Suspended accounts' })).toBeInTheDocument()
    expect(await screen.findByRole('columnheader', { name: 'Suspended' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Created' })).toBeInTheDocument()
    expect(screen.getAllByText(/by System/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Inactive account/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Remove jtan' })[0]).toBeEnabled()
    expect(screen.queryByRole('radio')).toBeNull()

    await userEvent.click(within(screen.getByRole('table')).getAllByRole('checkbox')[1])
    await userEvent.click(screen.getByRole('button', { name: 'Confirm selected as reviewed' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(calls).toContainEqual({
        key: 'POST /api/account-reviews/tasks/t1/decisions',
        body: { itemIds: ['i1'], decision: 'confirm' },
      }),
    )
  })
})
