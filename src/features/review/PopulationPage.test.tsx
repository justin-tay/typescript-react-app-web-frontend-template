import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderAt, stubApi, task } from './test-helpers'

describe('suspended and removed accounts pages', () => {
  beforeEach(() => {
    sessionStorage.clear()
    document.cookie = 'XSRF-TOKEN=abc'
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lists the accounts with who did it and why, and says what to do', async () => {
    stubApi()
    renderAt('/admin/reviews/t1/suspended')

    expect(await screen.findByRole('heading', { name: 'Suspended accounts' })).toBeInTheDocument()
    expect((await screen.findAllByText('Old Account')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('System').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Inactive account/).length).toBeGreaterThan(0)
    expect(screen.getByText(/by the system or by an administrator/)).toBeInTheDocument()
    expect(screen.getByText(/You do not need to check every account/)).toBeInTheDocument()
    expect(screen.getByText(/you cannot change these accounts here/)).toBeInTheDocument()
  })

  it('shows the days inactive up to the suspension, so the figure does not shift', async () => {
    stubApi()
    renderAt('/admin/reviews/t1/suspended')

    expect(await screen.findByRole('columnheader', { name: 'Days inactive' })).toBeInTheDocument()
    expect(screen.getAllByText('30').length).toBeGreaterThan(0)
    expect(screen.getAllByText('when suspended').length).toBeGreaterThan(0)
  })

  it('keeps Confirm off until one of the two choices is made', async () => {
    stubApi()
    renderAt('/admin/reviews/t1/suspended')
    const confirm = await screen.findByRole('button', { name: 'Confirm suspended accounts' })
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
    renderAt('/admin/reviews/t1/suspended')
    await screen.findAllByText('Old Account')

    await userEvent.click(screen.getByRole('radio', { name: 'I have concerns about this list.' }))
    const confirm = screen.getByRole('button', { name: 'Confirm with remarks' })
    expect(confirm).toBeDisabled()
    expect(screen.getByText(/does not stop the review from completing/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Remarks/), 'Two accounts missing')
    await userEvent.click(confirm)

    await waitFor(() =>
      expect(calls).toContainEqual({
        key: 'POST /api/account-reviews/tasks/t1/populations/suspended/confirmation',
        body: { note: 'Two accounts missing' },
      }),
    )
  })

  it('shows who confirmed a list, with any remarks, and offers no second confirmation', async () => {
    stubApi({
      task: task({
        populations: {
          suspended: {
            confirmed: true,
            confirmedBy: 'rev1',
            confirmedAt: '2026-10-02T09:00:00Z',
            count: 1,
            note: 'Two accounts missing',
          },
          removed: { confirmed: false },
        },
      }),
    })
    renderAt('/admin/reviews/t1/suspended')

    expect(await screen.findByText('Confirmed with remarks')).toBeInTheDocument()
    expect(screen.getByText(/Confirmed by rev1/)).toBeInTheDocument()
    expect(screen.getByText('Remarks: Two accounts missing')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirm suspended accounts/ })).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('offers no confirmation once the task is completed', async () => {
    stubApi({ task: task({ status: 'completed' }) })
    renderAt('/admin/reviews/t1/suspended')
    await screen.findAllByText('Old Account')
    expect(screen.queryByRole('radio')).toBeNull()
  })
})
