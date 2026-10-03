import type { ReauthenticationRequiredError } from '@/shared/lib/api-errors'

/**
 * `reauthenticated`: the person confirmed in place (a passkey), so the request can go again.
 * `cancelled`: they chose not to. Signing in again at Keycloak leaves the page, so that path
 * never settles; the form is restored from its saved draft once the browser is back
 * (see `use-reauth-resume.ts`).
 */
export type ReauthOutcome = 'reauthenticated' | 'cancelled'

type Details = Pick<ReauthenticationRequiredError, 'method' | 'maxAge' | 'reauthenticationUri'>

interface Pending {
  details: Details
  settle: (outcome: ReauthOutcome) => void
}

let pending: Pending | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

/**
 * Asks the person to sign in again before a sensitive change can go through. `ReauthModal`
 * (mounted once at the app root) shows it; only one request is open at a time, and a second
 * while one is open is cancelled rather than queued.
 */
export function requestReauthentication(details: Details): Promise<ReauthOutcome> {
  if (pending) return Promise.resolve('cancelled')
  return new Promise<ReauthOutcome>((resolve) => {
    pending = {
      details,
      settle: (outcome) => {
        pending = null
        emit()
        resolve(outcome)
      },
    }
    emit()
  })
}

export function getReauthRequest(): Details | null {
  return pending?.details ?? null
}

export function subscribeReauthRequest(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function settleReauthRequest(outcome: ReauthOutcome): void {
  pending?.settle(outcome)
}

interface RegisteredForm {
  key: string
  getDraft: () => unknown
}

const forms: RegisteredForm[] = []

/**
 * Lets a mounted form say what to keep if a sensitive change sends the browser away to sign in
 * (see `use-reauth-resume.ts`). The most recently registered form is the one in front, so it is
 * the one saved. Returns the function that removes it again.
 */
export function registerReauthForm(key: string, getDraft: () => unknown): () => void {
  const form = { key, getDraft }
  forms.push(form)
  return () => {
    const index = forms.indexOf(form)
    if (index >= 0) forms.splice(index, 1)
  }
}

export function activeReauthForm(): RegisteredForm | null {
  return forms.at(-1) ?? null
}
