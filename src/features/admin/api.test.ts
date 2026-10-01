import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteGroup, getGroup, getUser, removeUser, suspendUser, unsuspendUser, updateGroup, updateUser } from './api'

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return () => String(fetchMock.mock.calls[0][0])
}

// An id comes from the address bar (`/admin/users/:id`), so it is untrusted.
const HOSTILE = '../groups?x=1#y'
const ENCODED = '..%2Fgroups%3Fx%3D1%23y'

describe('admin api paths', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['getUser', () => getUser(HOSTILE), `/api/admin/users/${ENCODED}`],
    [
      'updateUser',
      () => updateUser(HOSTILE, { name: 'a', email: 'a@b.c', groupIds: [] }),
      `/api/admin/users/${ENCODED}`,
    ],
    ['suspendUser', () => suspendUser(HOSTILE, { reasonCode: 'other' }), `/api/admin/users/${ENCODED}/suspend`],
    ['unsuspendUser', () => unsuspendUser(HOSTILE), `/api/admin/users/${ENCODED}/unsuspend`],
    ['removeUser', () => removeUser(HOSTILE, { reasonCode: 'other' }), `/api/admin/users/${ENCODED}/remove`],
    ['getGroup', () => getGroup(HOSTILE), `/api/admin/groups/${ENCODED}`],
    ['updateGroup', () => updateGroup(HOSTILE, { name: 'g', roleIds: [] }), `/api/admin/groups/${ENCODED}`],
    ['deleteGroup', () => deleteGroup(HOSTILE), `/api/admin/groups/${ENCODED}`],
  ])('%s keeps the id inside one path segment', async (_name, call, expected) => {
    const requested = stubFetch()

    await call()

    expect(requested()).toBe(expected)
  })
})
