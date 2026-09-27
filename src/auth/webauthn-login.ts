import { base64UrlToBuffer, bufferToBase64Url } from '../lib/webauthn-codec'
import { apiFetch } from '../lib/api-fetch'

/** The subset of Spring Security's WebAuthn request-options JSON this app reads. */
export interface PublicKeyCredentialRequestOptionsJSON {
  rpId: string
  challenge: string
  timeout?: number
  userVerification?: string
  allowCredentials?: { id: string; type: string; transports?: string[] }[]
  extensions?: Record<string, unknown>
}

/**
 * Spring Security's own WebAuthn login-options endpoint; anonymous-accessible. An idle
 * session leaves the browser holding a dead session cookie, which this endpoint answers
 * with 401 (see `AuditingInvalidSessionStrategy` in the backend). That response also hands
 * back a fresh session cookie, so a single retry — picking up the new CSRF cookie via
 * `apiFetch` — succeeds instead of leaving the user stuck on a raw HTTP error.
 */
async function passkeyLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const response = await apiFetch('/api/webauthn/authenticate/options', { method: 'POST' }, { retryOnceOn401: true })
  if (!response.ok) throw new Error(`Could not start passkey sign-in (HTTP ${response.status}).`)
  return (await response.json()) as PublicKeyCredentialRequestOptionsJSON
}

/**
 * Spring Security's own WebAuthn login endpoint: on success it starts a new authenticated
 * session (a fresh `SESSION` cookie), so the caller just needs to reload the app's auth
 * state afterwards rather than handle a token itself.
 */
async function completePasskeyLogin(body: unknown): Promise<Response> {
  return apiFetch('/api/login/webauthn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * Fetches request options, prompts the authenticator via `navigator.credentials.get`, and
 * posts the assertion back. Throws a plain `Error` if the browser or user cancels the prompt.
 */
async function performPasskeyCeremony(): Promise<Response> {
  const options = await passkeyLoginOptions()

  const publicKey: PublicKeyCredentialRequestOptions = {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map((credential) => ({
      ...credential,
      id: base64UrlToBuffer(credential.id),
      type: 'public-key',
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    })),
    userVerification: options.userVerification as UserVerificationRequirement | undefined,
  }

  let credential: PublicKeyCredential
  try {
    const assertion = await navigator.credentials.get({ publicKey })
    if (!assertion) throw new Error('The browser did not return a passkey.')
    credential = assertion as PublicKeyCredential
  } catch {
    throw new Error('Passkey sign-in was cancelled or not completed.')
  }

  const authenticatorResponse = credential.response as AuthenticatorAssertionResponse
  return completePasskeyLogin({
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      authenticatorData: bufferToBase64Url(authenticatorResponse.authenticatorData),
      clientDataJSON: bufferToBase64Url(authenticatorResponse.clientDataJSON),
      signature: bufferToBase64Url(authenticatorResponse.signature),
      userHandle: authenticatorResponse.userHandle ? bufferToBase64Url(authenticatorResponse.userHandle) : undefined,
    },
  })
}

/**
 * True only for the dead-session 401: the backend's generic unauthenticated response is
 * `application/problem+json` with `type: "urn:problem:unauthenticated"` (see
 * `ProblemDetailAuthenticationEntryPoint` / `AuditingInvalidSessionStrategy` in the backend).
 * A rejected WebAuthn assertion — wrong, deleted, or unknown passkey — instead falls through
 * to Spring Security's own `HttpStatusEntryPoint`, an empty 401 body with no content-type at
 * all, so it fails this check and is never mistaken for a dead session.
 */
async function isDeadSessionResponse(response: Response): Promise<boolean> {
  if (response.status !== 401) return false
  try {
    const problem = (await response.clone().json()) as { type?: string }
    return problem.type === 'urn:problem:unauthenticated'
  } catch {
    return false
  }
}

/**
 * Runs the full passkey login ceremony. If the session dies between fetching options and
 * submitting the assertion, `/login/webauthn` answers 401 for an assertion that's now bound
 * to a dead session's challenge — retrying that same request can't succeed, so instead this
 * silently restarts the whole ceremony once (fresh options, a fresh authenticator prompt)
 * rather than surface a confusing error for what the user experiences as one sign-in attempt.
 * A 401 for any other reason (the passkey was deleted, the assertion just doesn't verify) is
 * not retried — restarting the ceremony would only re-prompt for a passkey that will never work.
 */
export async function loginWithPasskey(): Promise<void> {
  let response = await performPasskeyCeremony()
  if (await isDeadSessionResponse(response)) response = await performPasskeyCeremony()
  if (!response.ok) throw new Error('That passkey was not recognized.')
}
