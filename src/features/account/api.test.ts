import { afterEach, describe, expect, it, vi } from 'vitest'
import { deletePasskey, renamePasskey } from './api'

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation(async () => new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  return () => String(fetchMock.mock.calls[0][0])
}

describe('account api paths', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps a passkey id inside one path segment when renaming', async () => {
    const requested = stubFetch()

    await renamePasskey('../../admin/users', 'x')

    expect(requested()).toBe('/api/account/passkeys/..%2F..%2Fadmin%2Fusers')
  })

  it('keeps a credential id inside one path segment when deleting', async () => {
    const requested = stubFetch()

    await deletePasskey('a/b?c')

    expect(requested()).toBe('/api/webauthn/register/a%2Fb%3Fc')
  })
})
