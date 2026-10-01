/**
 * The base64url <-> ArrayBuffer conversions Spring Security's WebAuthn endpoints need:
 * every binary field (challenge, credential IDs, the created credential's own response)
 * travels as base64url text in JSON, per the WebAuthn spec's JSON serialization, but the
 * browser's `navigator.credentials` API works in ArrayBuffers. There is no bundled
 * WebAuthn helper library in this template (Spring Security ships none either — its docs
 * point to its own demo pages), so this is a small hand-rolled version of that glue,
 * shared by the registration flow (account/webauthn.ts) and the login flow (login/webauthn-login.ts).
 */
export function base64UrlToBuffer(value: string): ArrayBuffer {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window
}
