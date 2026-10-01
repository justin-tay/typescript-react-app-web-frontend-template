import { afterEach, describe, expect, it, vi } from 'vitest'
import { decide, getTask, getTaskSummary, listItems, listTasks, suspendItem, unsuspendItem } from './api'

function stubFetch(body: unknown = {}, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(status === 204 ? null : JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const calledUrl = (fetchMock: ReturnType<typeof vi.fn>) =>
  new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost')

describe('review api', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists tasks with the type and status filters and the shared list contract', async () => {
    const fetchMock = stubFetch()
    await listTasks({ page: 1, size: 20, sort: ['startDate,desc'], filters: { status: 'open', type: '' } })

    const url = calledUrl(fetchMock)
    expect(url.pathname).toBe('/api/tasks')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '1',
      size: '20',
      sort: 'startDate,desc',
      status: 'open',
    })
  })

  it('reads the task summary', async () => {
    const fetchMock = stubFetch({ openCount: 1, overdueCount: 0 })
    expect(await getTaskSummary()).toEqual({ openCount: 1, overdueCount: 0 })
    expect(calledUrl(fetchMock).pathname).toBe('/api/tasks/summary')
  })

  it('always sends the category when listing items, with the review status filter', async () => {
    const fetchMock = stubFetch()
    await listItems('t1', {
      category: 'suspended',
      page: 0,
      size: 10,
      filters: { reviewStatus: 'pending_verification' },
    })

    const url = calledUrl(fetchMock)
    expect(url.pathname).toBe('/api/account-reviews/tasks/t1/items')
    expect(url.searchParams.get('category')).toBe('suspended')
    expect(url.searchParams.get('reviewStatus')).toBe('pending_verification')
  })

  it('posts a batch decision as JSON with the CSRF header', async () => {
    document.cookie = 'XSRF-TOKEN=abc'
    const fetchMock = stubFetch(undefined, 204)
    await decide('t1', { itemIds: ['i1', 'i2'], decision: 'remove', reasonCode: 'left_organisation' })

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/account-reviews/tasks/t1/decisions')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      itemIds: ['i1', 'i2'],
      decision: 'remove',
      reasonCode: 'left_organisation',
    })
    expect(init.headers['X-XSRF-TOKEN']).toBe('abc')
  })

  it('suspends an item from its task', async () => {
    const fetchMock = stubFetch(undefined, 204)
    await suspendItem('t1', 'i1', { reasonCode: 'other', note: 'checked' })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/account-reviews/tasks/t1/items/i1/suspend')
  })
})

describe('review api paths', () => {
  afterEach(() => vi.unstubAllGlobals())

  // A task id comes from the address bar (`/admin/reviews/:taskId`), so it is untrusted.
  it.each([
    ['getTask', (hostile: string) => getTask(hostile), '/api/account-reviews/tasks/..%2Fusers'],
    [
      'listItems',
      (hostile: string) => listItems(hostile, { category: 'active', page: 0, size: 20 }),
      '/api/account-reviews/tasks/..%2Fusers/items',
    ],
    [
      'decide',
      (hostile: string) => decide(hostile, { itemIds: ['i1'], decision: 'verify' }),
      '/api/account-reviews/tasks/..%2Fusers/decisions',
    ],
    [
      'suspendItem',
      (hostile: string) => suspendItem(hostile, '../x', { reasonCode: 'other' }),
      '/api/account-reviews/tasks/..%2Fusers/items/..%2Fx/suspend',
    ],
    [
      'unsuspendItem',
      (hostile: string) => unsuspendItem(hostile, '../x'),
      '/api/account-reviews/tasks/..%2Fusers/items/..%2Fx/unsuspend',
    ],
  ])('%s keeps each id inside one path segment', async (_name, call, expected) => {
    const fetchMock = stubFetch()

    await call('../users')

    expect(String(fetchMock.mock.calls[0][0]).split('?')[0]).toBe(expected)
  })
})
