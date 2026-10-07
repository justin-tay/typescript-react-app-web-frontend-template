import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { entry, renderAt, stubApi, task } from './test-helpers'

describe('removed accounts page', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.cookie = 'XSRF-TOKEN=abc'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lists the accounts with who did it and why, and says what to do', async () => {
    stubApi()
    renderAt('/admin/reviews/t1/removed')

    expect(await screen.findByRole('heading', { name: 'Removed accounts' })).toBeInTheDocument()
    expect((await screen.findAllByText('Old Account')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('System').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Inactive account/).length).toBeGreaterThan(0)
    expect(screen.getByText(/by the system or by an administrator/)).toBeInTheDocument()
    expect(screen.getByText(/You do not need to check every account/)).toBeInTheDocument()
    expect(screen.getByText(/you cannot change these accounts here/)).toBeInTheDocument()
  })

  it('shows when the account was created, or Unknown for a removal recorded before it was kept', async () => {
    stubApi({
      population: [
        { ...entry, createdAt: '2025-03-04T00:00:00Z' },
        { ...entry, userId: 'u10', username: 'older', name: 'Older Account', createdAt: null },
      ],
    })
    renderAt('/admin/reviews/t1/removed')

    expect(await screen.findByRole('columnheader', { name: 'Created' })).toBeInTheDocument()
    expect((await screen.findAllByText('4 Mar 2025')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Unknown').length).toBeGreaterThan(0)
  })

  it('shows the days inactive up to the removal, so the figure does not shift', async () => {
    stubApi()
    renderAt('/admin/reviews/t1/removed')

    expect(await screen.findByRole('columnheader', { name: 'Days inactive' })).toBeInTheDocument()
    expect((await screen.findAllByText('30')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('when removed').length).toBeGreaterThan(0)
  })

  it('keeps Confirm off until one of the two choices is made', async () => {
    stubApi()
    renderAt('/admin/reviews/t1/removed')
    const confirm = await screen.findByRole('button', { name: 'Confirm removed accounts' })
    expect(confirm).toBeDisabled()

    await userEvent.click(
      screen.getByRole('radio', { name: 'I have reviewed a few records and the list looks complete and correct.' }),
    )
    expect(confirm).toBeEnabled()
    expect(screen.queryByLabelText(/Remarks/)).toBeNull()
  })

  it('confirms a list that looks correct without a note', async () => {
    const calls = stubApi()
    renderAt('/admin/reviews/t1/removed')
    await screen.findAllByText('Old Account')

    await userEvent.click(
      screen.getByRole('radio', { name: 'I have reviewed a few records and the list looks complete and correct.' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Confirm removed accounts' }))

    await waitFor(() =>
      expect(calls).toContainEqual({
        key: 'POST /api/account-reviews/tasks/t1/populations/removed/confirmation',
        body: {},
      }),
    )
  })

  it('needs remarks to confirm with concerns, and saves them as the note', async () => {
    const calls = stubApi()
    renderAt('/admin/reviews/t1/removed')
    await screen.findAllByText('Old Account')

    await userEvent.click(screen.getByRole('radio', { name: 'I have concerns about this list.' }))
    const confirm = screen.getByRole('button', { name: 'Confirm with remarks' })
    expect(confirm).toBeDisabled()
    expect(screen.getByText(/does not stop the review from completing/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Remarks/), 'Two accounts missing')
    await userEvent.click(confirm)

    await waitFor(() =>
      expect(calls).toContainEqual({
        key: 'POST /api/account-reviews/tasks/t1/populations/removed/confirmation',
        body: { note: 'Two accounts missing' },
      }),
    )
  })

  it('shows who confirmed a list, with any remarks, and offers no second confirmation', async () => {
    stubApi({
      task: task({
        removed: {
          confirmed: true,
          confirmedBy: 'rev1',
          confirmedAt: '2026-10-02T09:00:00Z',
          count: 1,
          note: 'Two accounts missing',
        },
      }),
    })
    renderAt('/admin/reviews/t1/removed')

    expect(await screen.findByText('Confirmed with remarks')).toBeInTheDocument()
    expect(screen.getByText(/Confirmed by rev1/)).toBeInTheDocument()
    expect(screen.getByText('Remarks: Two accounts missing')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirm removed accounts/ })).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('offers no confirmation once the task is completed', async () => {
    stubApi({ task: task({ status: 'completed' }) })
    renderAt('/admin/reviews/t1/removed')
    await screen.findAllByText('Old Account')
    expect(screen.queryByRole('radio')).toBeNull()
  })
})
