import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Task } from './api'
import { renderAt, stubApi, task } from './test-helpers'

describe('ReviewOverview', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('shows the period, one card for each part and the instructions', async () => {
    stubApi({ task: task({ progress: { reviewed: 1, total: 4 } }) })
    renderAt('/admin/reviews/t1')

    expect(await screen.findByRole('heading', { name: 'Account review' })).toBeInTheDocument()
    expect(screen.getByText('1 Oct 2026 to 31 Oct 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Active accounts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suspended accounts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Removed accounts' })).toBeInTheDocument()
    expect(screen.getByText('1 / 4 reviewed (25%)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review instructions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Review active accounts/ })).toHaveAttribute(
      'href',
      '/admin/reviews/t1/active',
    )
  })

  it('says how many parts are done, with Reviewed on the done ones and Open on the rest', async () => {
    stubApi({
      task: task({
        progress: { reviewed: 2, total: 2 },
        populations: {
          suspended: { confirmed: true, confirmedBy: 'rev1', confirmedAt: '2026-10-02T09:00:00Z', count: 3 },
          removed: { confirmed: false },
        },
      }),
    })
    renderAt('/admin/reviews/t1')

    expect(await screen.findByText(/2 of 3 parts done/)).toBeInTheDocument()
    const card = (title: string) => within(screen.getByRole('region', { name: title }))
    expect(card('Active accounts').getByText('Reviewed')).toBeInTheDocument()
    expect(card('Suspended accounts').getByText('Reviewed')).toBeInTheDocument()
    expect(card('Removed accounts').getByText('Open')).toBeInTheDocument()
    expect(screen.getByText(/Confirmed by rev1/)).toBeInTheDocument()
    expect(card('Removed accounts').getByText('Waiting for your confirmation')).toBeInTheDocument()
    // The removed list is not confirmed, so its card shows how many accounts it holds now.
    expect(await card('Removed accounts').findByText('1')).toBeInTheDocument()
  })

  it('says the review will close when everything is done', async () => {
    stubApi({
      task: task({
        progress: { reviewed: 2, total: 2 },
        populations: {
          suspended: { confirmed: true, confirmedBy: 'rev1', count: 3 },
          removed: { confirmed: true, confirmedBy: 'rev1', count: 1 },
        },
      }),
    })
    renderAt('/admin/reviews/t1')
    expect(await screen.findByText(/Everything is done/)).toBeInTheDocument()
    expect(screen.getAllByText('Reviewed')).toHaveLength(3)
  })

  it('labels the downloads as drafts while the task is open', async () => {
    stubApi()
    renderAt('/admin/reviews/t1')

    const nav = await screen.findByRole('navigation', { name: 'Report downloads' })
    expect(within(nav).getByRole('link', { name: 'PDF (draft)' })).toHaveAttribute(
      'href',
      '/api/account-reviews/tasks/t1/report?format=pdf',
    )
    expect(within(nav).getByRole('link', { name: 'Excel (draft)' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'CSV (draft)' })).toBeInTheDocument()
  })

  it('is read-only once completed, with downloads that are not drafts', async () => {
    stubApi({
      task: task({
        status: 'completed',
        completedAt: '2026-10-20T10:00:00Z',
        completedBy: 'system',
        reportAvailable: true,
        progress: { reviewed: 2, total: 2 },
        populations: {
          suspended: { confirmed: true, confirmedBy: 'rev1', count: 3 },
          removed: { confirmed: true, confirmedBy: 'rev1', count: 1 },
        },
      }),
    })
    renderAt('/admin/reviews/t1')

    expect(await screen.findByText(/by the system. This review is read-only/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'PDF' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View active accounts/ })).toBeInTheDocument()
    expect(screen.getAllByText('Reviewed')).toHaveLength(3)
  })

  it('copes with the nulls the server sends for what is not there yet', async () => {
    stubApi({
      task: task({
        completedAt: null,
        completedBy: null,
        populations: {
          suspended: { confirmed: false, confirmedBy: null, confirmedAt: null, note: null, count: null },
          removed: { confirmed: false, confirmedBy: null, confirmedAt: null, note: null, count: null },
        },
      } as unknown as Partial<Task>),
    })
    renderAt('/admin/reviews/t1')
    expect(await screen.findByRole('heading', { name: 'Suspended accounts' })).toBeInTheDocument()
  })

  it('says so when the review does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })))
    renderAt('/admin/reviews/t1')
    expect(await screen.findByText('This review does not exist.')).toBeInTheDocument()
  })
})
