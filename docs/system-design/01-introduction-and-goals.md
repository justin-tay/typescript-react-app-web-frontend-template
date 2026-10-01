# 1. Introduction and Goals

<!-- arc42: Describes the relevant requirements and the driving forces that
software architects and development team must consider. -->

## 1.1 Requirements Overview

<!-- arc42-generated -->

A React + TypeScript single-page application that is the web frontend of `java-app-web-api-server-template`. It is a **template**: it demonstrates a signed-in application (sign-in, personal account pages, and an administration area) that teams copy, rename and trim. The name "MyService" and the logo are placeholders (see the README, "Branding").

| Priority | Requirement                        | Description                                                                                                                                                                   |
| -------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Sign in and sign out               | Single sign-on through Keycloak (browser redirect flow) and passkey (WebAuthn) sign-in. The sign-in card is shown in place of whatever page was asked for.                    |
| High     | Session handling                   | Warn before the backend's idle timeout with a chance to stay signed in, keep every open tab in step, and show the sign-in card in place when the session ends for any reason. |
| High     | Administration of users and groups | List, search, filter, create, edit, suspend, unsuspend and remove users; create, edit and delete groups and the roles they grant.                                             |
| High     | Account review                     | A reviewer verifies, removes, suspends and unsuspends accounts for a review task, in bulk for verify and remove.                                                              |
| Medium   | Audit trail                        | Read-only list of who changed which user, group, role, setting or review.                                                                                                     |
| Medium   | Settings                           | Inactivity suspension and removal periods, and the review period.                                                                                                             |
| Medium   | Personal account pages             | Read-only personal info (identity is delegated to Keycloak) and a passkey manager (list, rename, add, delete).                                                                |
| Medium   | Role-aware navigation              | The administration area shows each person only what their roles allow; the backend still enforces every rule.                                                                 |
| Low      | Overview                           | A landing page showing what needs a reviewer's attention and headline user and group counts.                                                                                  |

<!-- /arc42-generated -->

<!-- arc42-manual: Link the product requirements document, if one exists, with its version and location -->
<!-- /arc42-manual -->

## 1.2 Quality Goals

<!-- arc42: The top three (max five) quality goals for the architecture whose
fulfillment is of highest importance to the major stakeholders. -->

<!-- arc42-generated -->

Inferred from the code, the README and the ADRs. **Confirm or change these with the stakeholders.**

| #   | Quality Goal                                    | Motivation                                                                                                                                          | Scenario                                                                                                                                                                                   |
| --- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Security of the browser side of the session     | The app shows personal data and offers privileged actions (removing accounts). The browser must not weaken what the backend enforces.               | A script injection attempt is blocked by a nonce-based CSP; saved search text is cleared when the session ends in any tab; a write without the CSRF header is rejected.                    |
| 2   | Maintainability as a copyable template          | Teams copy this repository and keep evolving it, so its structure must stay understandable and its rules must be checked by tooling, not by memory. | An import from one feature to another fails lint; a new feature without a lint override fails a test.                                                                                      |
| 3   | Accessibility and usability on all screen sizes | A government-style service must work with a keyboard and a screen reader and on a phone.                                                            | The mobile navigation traps focus and closes with Escape; lists become cards below `lg`; focus moves to the page heading after navigation.                                                 |
| 4   | Resilience to a failing backend                 | The frontend is only as available as the API and Keycloak behind it.                                                                                | When the API answers 502, 503 or 504, a page shows a "service unavailable" notice with a retry instead of a blank screen; a page that throws while rendering leaves the navigation usable. |

<!-- /arc42-generated -->

## 1.3 Stakeholders

<!-- arc42: Explicit overview of stakeholders of the system, i.e. all persons,
roles or organizations that should know the architecture. -->

<!-- arc42-generated -->

| Role                                              | Contact | Expectations                                                                                        |
| ------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| Teams adopting the template                       |         | A clear structure, enforced conventions, and a short list of things to rename and trim.             |
| Signed-in people                                  |         | Sign in quickly, see their own details, manage their passkeys, never lose work to a silent timeout. |
| Administrators                                    |         | Efficient lists, filters and bulk actions; safe, confirmed destructive actions.                     |
| Account reviewers                                 |         | See what is due or overdue and decide in bulk without acting on their own account.                  |
| Backend team (`java-app-web-api-server-template`) |         | The frontend follows the API contract: problem types, paging, CSRF and the `/api` prefix.           |
| Whoever serves the built files                    |         | A clear contract for the CSP nonce and response headers (see section 8, security).                  |

<!-- /arc42-generated -->

<!-- arc42-manual: Add stakeholders not discoverable from the codebase, with contacts -->
<!-- /arc42-manual -->
