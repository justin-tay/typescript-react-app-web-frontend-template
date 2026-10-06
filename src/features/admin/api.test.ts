import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteRole, getRole, getUser, removeUser, suspendUser, unsuspendUser, updateRole, updateUser } from './api'

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({}), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return () => String(fetchMock.mock.calls[0][0])
}

// An id comes from the address bar (`/admin/users/:id`), so it is untrusted.
const HOSTILE = '../roles?x=1#y'
const ENCODED = '..%2Froles%3Fx%3D1%23y'

describe('admin api paths', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['getUser', () => getUser(HOSTILE), `/api/admin/users/${ENCODED}`],
    [
      'updateUser',
      () => updateUser(HOSTILE, { name: 'a', email: 'a@b.c', roleIds: [] }),
      `/api/admin/users/${ENCODED}`,
    ],
    ['suspendUser', () => suspendUser(HOSTILE, { reasonCode: 'other' }), `/api/admin/users/${ENCODED}/suspend`],
    ['unsuspendUser', () => unsuspendUser(HOSTILE), `/api/admin/users/${ENCODED}/unsuspend`],
    ['removeUser', () => removeUser(HOSTILE, { reasonCode: 'other' }), `/api/admin/users/${ENCODED}/remove`],
    ['getRole', () => getRole(HOSTILE), `/api/admin/roles/${ENCODED}`],
    ['updateRole', () => updateRole(HOSTILE, { name: 'g', permissionIds: [] }), `/api/admin/roles/${ENCODED}`],
    ['deleteRole', () => deleteRole(HOSTILE), `/api/admin/roles/${ENCODED}`],
  ])('%s keeps the id inside one path segment', async (_name, call, expected) => {
    const requested = stubFetch()

    await call()

    expect(requested()).toBe(expected)
  })
})
