# 12. Glossary

<!-- arc42: The most important domain and technical terms that your stakeholders
use when discussing the system. -->

<!-- arc42-generated -->

| Term                  | Definition                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ADR                   | Architecture Decision Record: a short document recording one decision, its context and consequences (`docs/adr/`).               |
| Absolute timeout      | The backend's maximum session length. It cannot be extended by activity, so the app does not warn about it.                      |
| Account review        | A periodic task in which a reviewer verifies, removes or suspends accounts.                                                      |
| Audit trail           | The read-only record of business changes made through the backend.                                                               |
| `AuthGate`            | The component that shows the sign-in card in place of a page until someone is signed in.                                         |
| `BroadcastChannel`    | A browser API for messages between tabs of the same origin; used to end the session everywhere and to share idle-timer activity. |
| CSP                   | Content Security Policy: a response header that limits what scripts, styles and connections a page may use.                      |
| CSP nonce             | A random value, fresh for each response, that marks the page's own scripts and styles as allowed.                                |
| CSRF                  | Cross-site request forgery. Defended by echoing the `XSRF-TOKEN` cookie as an `X-XSRF-TOKEN` header on writes.                   |
| Delegated to Keycloak | The backend's term for identity data (name, email) that the application never edits.                                             |
| Idle timeout          | How long the backend lets a session sit without requests before ending it.                                                       |
| Keycloak              | The identity provider the backend uses for single sign-on.                                                                       |
| OIDC                  | OpenID Connect, the sign-in protocol between the backend and Keycloak.                                                           |
| OUI                   | Open UI, the component library this app is built on (React Aria Components and Tailwind).                                        |
| Passkey               | A WebAuthn credential used to sign in without a password.                                                                        |
| Problem response      | An RFC 9457 `application/problem+json` error body, with a `type`, a `detail` and optional field errors.                          |
| Re-authentication     | Signing in again, with `max_age=0`, because the backend requires a recent sign-in for a sensitive change.                        |
| Return path           | The page asked for before an SSO sign-in, remembered so the person lands on it afterwards.                                       |
| SGDS                  | Singapore Government Design System, which OUI follows and whose templates inform the layout.                                     |
| SPA                   | Single-page application: one page load, with navigation handled in the browser.                                                  |
| Suspension            | A reversible block on an account: the person is signed out and cannot sign in until unsuspended.                                 |
| Trusted Types         | A browser feature that restricts how strings become HTML or script; reported on, not enforced.                                   |
| WebAuthn              | The browser API for passkeys (`navigator.credentials`).                                                                          |

<!-- /arc42-generated -->

<!-- arc42-manual: Add domain terms requiring business context -->
<!-- /arc42-manual -->
