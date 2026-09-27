import { base64UrlToBuffer, bufferToBase64Url } from '../lib/webauthn-codec'
import { completePasskeyRegistration, passkeyRegistrationOptions } from './api'

export { isWebAuthnSupported } from '../lib/webauthn-codec'

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
