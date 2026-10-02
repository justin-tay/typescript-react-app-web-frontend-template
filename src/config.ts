/** A placeholder name: rename it here. It is also the browser tab title. */
export const APP_NAME = 'MyService'
export const COPYRIGHT_HOLDER = 'Your Organisation'

/**
 * Must match the backend's own `server.servlet.session.timeout` (see its
 * application.yaml / commons-defaults.yaml). Nothing enforces this automatically: the
 * frontend approximates the session's idle deadline from this constant rather than the
 * backend telling it directly, so if a deployment changes the backend's timeout, this
 * must be updated to match or the warning in `src/shared/session/session-timeout.ts` will fire at
 * the wrong time.
 */
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000

/**
 * How much earlier than the backend's idle deadline the frontend ends the session itself. At zero
 * it signs out (which also ends Keycloak's session) rather than asking the server whether the
 * session is still alive. It must happen while the backend session still exists: the backend builds
 * Keycloak's logout address from that session's ID token, so a late sign-out can no longer end
 * Keycloak's session. So it must not fire late: the countdown starts when a response arrives,
 * a round trip after the backend started its own. Keep it above network latency, a few seconds is
 * plenty, and keep `SESSION_PROMPT_BEFORE_MS` shorter than the idle timeout minus this.
 */
export const SESSION_EXPIRY_MARGIN_MS = 15 * 1000

/** How long before the idle deadline to warn the user, with a chance to stay signed in. */
export const SESSION_PROMPT_BEFORE_MS = 60 * 1000

/**
 * Footer links. A .gov.sg service must show privacy and terms of use on every page, so
 * point these at the service's real pages; contact and feedback are optional.
 */
export const FOOTER_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: 'Contact', href: '#' },
  { label: 'Feedback', href: '#' },
  { label: 'Report Vulnerability', href: '#', external: true },
  { label: 'Privacy Statement', href: '#' },
  { label: 'Terms of Use', href: '#' },
]
