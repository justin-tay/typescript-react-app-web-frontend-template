import { base64UrlToBuffer, bufferToBase64Url } from '../lib/webauthn-codec'
import { csrfHeaders } from '../lib/csrf'

/** The subset of Spring Security's WebAuthn request-options JSON this app reads. */
export interface PublicKeyCredentialRequestOptionsJSON {
  rpId: string
  challenge: string
  timeout?: number
  userVerification?: string
  allowCredentials?: { id: string; type: string; transports?: string[] }[]
  extensions?: Record<string, unknown>
}

/** Spring Security's own WebAuthn login-options endpoint; anonymous-accessible. */
async function passkeyLoginOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const response = await fetch('/api/webauthn/authenticate/options', {
    method: 'POST',
    headers: { Accept: 'application/json', ...csrfHeaders() },
  })
  if (!response.ok) throw new Error(`Could not start passkey sign-in (HTTP ${response.status}).`)
  return (await response.json()) as PublicKeyCredentialRequestOptionsJSON
}

/**
 * Spring Security's own WebAuthn login endpoint: on success it starts a new authenticated
 * session (a fresh `SESSION` cookie), so the caller just needs to reload the app's auth
 * state afterwards rather than handle a token itself.
 */
async function completePasskeyLogin(body: unknown): Promise<void> {
  const response = await fetch('/api/login/webauthn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...csrfHeaders() },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('That passkey was not recognized.')
}

/**
 * Runs the full passkey login ceremony: fetches Spring Security's request options, prompts
 * the browser/authenticator via `navigator.credentials.get`, and posts the assertion back to
 * start a session. Throws a plain `Error` if the browser or user cancels the prompt, or if
 * the backend rejects the assertion.
 */
export async function loginWithPasskey(): Promise<void> {
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

  const response = credential.response as AuthenticatorAssertionResponse
  await completePasskeyLogin({
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : undefined,
    },
  })
}
