import { completePasskeyRegistration, passkeyRegistrationOptions } from './api'

/**
 * The base64url <-> ArrayBuffer conversions Spring Security's WebAuthn endpoints need:
 * every binary field (challenge, credential IDs, the created credential's own response)
 * travels as base64url text in JSON, per the WebAuthn spec's JSON serialization, but the
 * browser's `navigator.credentials` API works in ArrayBuffers. There is no bundled
 * WebAuthn helper library in this template (Spring Security ships none either — its docs
 * point to its own demo pages), so this is a small hand-rolled version of that glue.
 */
function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window
}

/**
 * Runs the full passkey registration ceremony: fetches Spring Security's creation options,
 * prompts the browser/authenticator via `navigator.credentials.create`, and posts the
 * result back. Throws `ReauthenticationRequiredError` (via the shared API error mapping)
 * if the session is not recent enough to register a passkey (docs/adr/0024's
 * `registrationMaxAge`), and a plain `Error` if the browser or user cancels the prompt.
 */
export async function registerPasskey(label: string): Promise<void> {
  const options = await passkeyRegistrationOptions()

  const publicKey: PublicKeyCredentialCreationOptions = {
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    user: { ...options.user, id: base64UrlToBuffer(options.user.id) },
    pubKeyCredParams: options.pubKeyCredParams as PublicKeyCredentialParameters[],
    excludeCredentials: options.excludeCredentials?.map((credential) => ({
      ...credential,
      id: base64UrlToBuffer(credential.id),
      type: 'public-key',
      transports: credential.transports as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: options.authenticatorSelection as AuthenticatorSelectionCriteria | undefined,
    attestation: options.attestation as AttestationConveyancePreference | undefined,
  }

  let credential: PublicKeyCredential
  try {
    const created = await navigator.credentials.create({ publicKey })
    if (!created) throw new Error('The browser did not create a passkey.')
    credential = created as PublicKeyCredential
  } catch {
    throw new Error('Passkey creation was cancelled or not completed.')
  }

  const response = credential.response as AuthenticatorAttestationResponse
  await completePasskeyRegistration({
    publicKey: {
      credential: {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        clientExtensionResults: credential.getClientExtensionResults(),
        authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
        response: {
          attestationObject: bufferToBase64Url(response.attestationObject),
          clientDataJSON: bufferToBase64Url(response.clientDataJSON),
          transports: response.getTransports?.() ?? [],
        },
      },
      label,
    },
  })
}
