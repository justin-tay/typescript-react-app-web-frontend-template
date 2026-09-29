import { noteServerActivity } from '@/shared/session/session-timeout'
import { apiFetch } from '@/shared/lib/api-fetch'
import { throwForResponse } from '@/shared/lib/api-errors'

export interface Passkey {
  id: string
  label: string
  created: string
  lastUsed: string | null
  backupEligible: boolean
  transports: string[]
}

async function accountFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isWrite = (init?.method ?? 'GET') !== 'GET'
  const response = await apiFetch(`/api${path}`, {
    ...init,
    headers: { ...(isWrite ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) return throwForResponse(response)
  noteServerActivity()
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** The signed-in user's own passkeys (see docs/adr/0024 in the backend). */
export async function listPasskeys(): Promise<Passkey[]> {
  return accountFetch('/account/passkeys')
}

export async function renamePasskey(id: string, label: string): Promise<void> {
  await accountFetch(`/account/passkeys/${id}`, { method: 'PATCH', body: JSON.stringify({ label }) })
}

/** Spring Security's own WebAuthn registration-options endpoint; not a `commons` API. */
export async function passkeyRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return accountFetch('/webauthn/register/options', { method: 'POST' })
}

/** Spring Security's own WebAuthn registration-completion endpoint. */
export async function completePasskeyRegistration(body: unknown): Promise<void> {
  await accountFetch('/webauthn/register', { method: 'POST', body: JSON.stringify(body) })
}

/** Spring Security's own WebAuthn credential-removal endpoint. */
export async function deletePasskey(credentialId: string): Promise<void> {
  await accountFetch(`/webauthn/register/${credentialId}`, { method: 'DELETE' })
}

/** The subset of the WebAuthn creation-options JSON this app reads; see ./webauthn.ts. */
export interface PublicKeyCredentialCreationOptionsJSON {
  rp: { id?: string; name: string }
  user: { id: string; name: string; displayName: string }
  challenge: string
  pubKeyCredParams: { type: string; alg: number }[]
  timeout?: number
  excludeCredentials?: { id: string; type: string; transports?: string[] }[]
  authenticatorSelection?: {
    residentKey?: string
    userVerification?: string
    authenticatorAttachment?: string
  }
  attestation?: string
}
