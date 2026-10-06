import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  confirmPopulation,
  countPopulation,
  decide,
  editGroups,
  getTask,
  getTaskSummary,
  listAssignableGroups,
  listDepartments,
  listItems,
  listPopulation,
  listTasks,
  reportUrl,
} from './api'

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

  it('lists items with the outcome, department and group filters', async () => {
    const fetchMock = stubFetch()
    await listItems('t1', {
      page: 0,
      size: 10,
      search: 'ada',
      filters: { outcome: 'confirmed_groups_edited', department: 'Finance', group: 'Users' },
    })

    const url = calledUrl(fetchMock)
    expect(url.pathname).toBe('/api/account-reviews/tasks/t1/items')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '0',
      size: '10',
      search: 'ada',
      outcome: 'confirmed_groups_edited',
      department: 'Finance',
      group: 'Users',
    })
  })

  it('lists a population by name', async () => {
    const fetchMock = stubFetch()
    await listPopulation('t1', 'suspended', { page: 0, size: 20, filters: { department: 'HR' } })

    const url = calledUrl(fetchMock)
    expect(url.pathname).toBe('/api/account-reviews/tasks/t1/populations/suspended')
    expect(url.searchParams.get('department')).toBe('HR')
  })

  it('reads the departments of a task and the groups a reviewer may assign', async () => {
    const fetchMock = stubFetch(['Finance'])
    expect(await listDepartments('t1')).toEqual(['Finance'])
    expect(calledUrl(fetchMock).pathname).toBe('/api/account-reviews/tasks/t1/departments')

    const groups = stubFetch([{ id: 'g1', name: 'Users' }])
    expect(await listAssignableGroups()).toEqual([{ id: 'g1', name: 'Users' }])
    expect(calledUrl(groups).pathname).toBe('/api/account-reviews/groups')
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

  it('saves the full set of group ids for an item', async () => {
    const fetchMock = stubFetch(undefined, 204)
    await editGroups('t1', 'i1', ['g1', 'g2'])

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/account-reviews/tasks/t1/items/i1/groups')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ groupIds: ['g1', 'g2'] })
  })

  it('confirms a population with an optional note', async () => {
    const fetchMock = stubFetch(undefined, 204)
    await confirmPopulation('t1', 'removed', 'checked')

    const [path, init] = fetchMock.mock.calls[0]
    expect(path).toBe('/api/account-reviews/tasks/t1/populations/removed/confirmation')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ note: 'checked' })
  })

  it('counts a population by asking for one row of it', async () => {
    const fetchMock = stubFetch({ items: [], page: 0, size: 1, totalItems: 28, totalPages: 28 })
    expect(await countPopulation('t1', 'suspended')).toBe(28)
    const url = calledUrl(fetchMock)
    expect(url.pathname).toBe('/api/account-reviews/tasks/t1/populations/suspended')
    expect(url.searchParams.get('size')).toBe('1')
  })

  it('builds the report link for a download format', () => {
    expect(reportUrl('t1', 'xlsx')).toBe('/api/account-reviews/tasks/t1/report?format=xlsx')
  })
})

describe('review api paths', () => {
  afterEach(() => vi.unstubAllGlobals())

  // A task id comes from the address bar (`/admin/reviews/:taskId`), so it is untrusted.
  it.each([
    ['getTask', (hostile: string) => getTask(hostile), '/api/account-reviews/tasks/..%2Fusers'],
    [
      'listItems',
      (hostile: string) => listItems(hostile, { page: 0, size: 20 }),
      '/api/account-reviews/tasks/..%2Fusers/items',
    ],
    [
      'listPopulation',
      (hostile: string) => listPopulation(hostile, 'removed', { page: 0, size: 20 }),
      '/api/account-reviews/tasks/..%2Fusers/populations/removed',
    ],
    [
      'listDepartments',
      (hostile: string) => listDepartments(hostile),
      '/api/account-reviews/tasks/..%2Fusers/departments',
    ],
    [
      'decide',
      (hostile: string) => decide(hostile, { itemIds: ['i1'], decision: 'confirm' }),
      '/api/account-reviews/tasks/..%2Fusers/decisions',
    ],
    [
      'editGroups',
      (hostile: string) => editGroups(hostile, '../x', ['g1']),
      '/api/account-reviews/tasks/..%2Fusers/items/..%2Fx/groups',
    ],
    [
      'confirmPopulation',
      (hostile: string) => confirmPopulation(hostile, 'removed'),
      '/api/account-reviews/tasks/..%2Fusers/populations/removed/confirmation',
    ],
  ])('%s keeps each id inside one path segment', async (_name, call, expected) => {
    const fetchMock = stubFetch()

    await call('../users')

    expect(String(fetchMock.mock.calls[0][0]).split('?')[0]).toBe(expected)
  })

  it('reportUrl keeps the task id inside one path segment', () => {
    expect(reportUrl('../users', 'pdf')).toBe('/api/account-reviews/tasks/..%2Fusers/report?format=pdf')
  })
})
