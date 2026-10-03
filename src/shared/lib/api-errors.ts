import { declareSignedOut } from '@/shared/session/session-broadcast'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * `unavailable`: the backend could not be reached or a gateway in front of it answered 502,
 * 503 or 504, so trying again later may work. `failed`: anything else.
 */
export type FailureKind = 'unavailable' | 'failed'

const GATEWAY_STATUSES = [502, 503, 504]

/** `fetch` rejects with a TypeError when there is no response at all (server down, offline). */
export function failureKind(e: unknown): FailureKind {
  if (e instanceof TypeError) return 'unavailable'
  if (e instanceof ApiError && GATEWAY_STATUSES.includes(e.status)) return 'unavailable'
  return 'failed'
}

/** A write rejected because the fields didn't validate; `fieldErrors` keys are field names. */
export class ValidationError extends ApiError {
  readonly fieldErrors: Record<string, string>

  constructor(message: string, fieldErrors: Record<string, string>) {
    super(message, 400)
    this.fieldErrors = fieldErrors
  }
}

/**
 * A write rejected because the signed-in user's login is older than the backend allows for
 * a sensitive change (administration, or registering a passkey — see docs/adr/0023 and
 * docs/adr/0024 in the backend). `useMutation` hands it to
 * `requestReauthentication` from `shared/session/reauth.ts`.
 */
export class ReauthenticationRequiredError extends ApiError {
  /** How the original login was made; absent for a session of any other kind. */
  readonly method?: 'oidc' | 'passkey'
  /** The longest age, in seconds, a login may have for this kind of change. */
  readonly maxAge?: number
  /** Where to send the browser to sign in again (OIDC only); always a same-origin path. */
  readonly reauthenticationUri?: string

  constructor(details: { method?: 'oidc' | 'passkey'; maxAge?: number; reauthenticationUri?: string } = {}) {
    super('Please sign in again to make this change.', 401)
    this.method = details.method
    this.maxAge = details.maxAge
    this.reauthenticationUri = details.reauthenticationUri
  }
}

interface ProblemDetailBody {
  type?: string
  detail?: string
  max_age?: number
  method?: string
  reauthentication_uri?: string
  errors?: { message: string; source?: { pointer?: string } }[]
}

function problemType(problem: ProblemDetailBody | null): string | undefined {
  return problem?.type?.replace(/^urn:problem:/, '')
}

async function readProblem(response: Response): Promise<ProblemDetailBody | null> {
  try {
    return (await response.json()) as ProblemDetailBody
  } catch {
    return null
  }
}

/** A path on this origin; anything else (another host, a scheme, a protocol-relative URL) is not followed. */
function sameOriginPath(uri: string | undefined): string | undefined {
  return uri !== undefined && /^\/(?![/\\])/.test(uri) ? uri : undefined
}

function reauthenticationError(problem: ProblemDetailBody | null): ReauthenticationRequiredError {
  const method = problem?.method === 'oidc' || problem?.method === 'passkey' ? problem.method : undefined
  return new ReauthenticationRequiredError({
    method,
    maxAge: typeof problem?.max_age === 'number' ? problem.max_age : undefined,
    reauthenticationUri: method === 'oidc' ? sameOriginPath(problem?.reauthentication_uri) : undefined,
  })
}

/** Maps one of the backend's RFC 9457 problem responses to the errors above. */
export async function throwForResponse(response: Response): Promise<never> {
  const problem = await readProblem(response)
  if (response.status === 401 && problemType(problem) === 'reauthentication-required') {
    throw reauthenticationError(problem)
  }
  if (response.status === 401) {
    // Reaching here (as opposed to the reauthentication-required branch above) means the
    // session itself is gone, discovered by a call that only ever fires from a page
    // `AuthGate` already confirmed was authenticated — so this is a real "you were
    // signed in, and now you're not" event, worth telling every open tab about.
    declareSignedOut()
    throw new ApiError('You are not signed in.', 401)
  }
  if (response.status === 403) throw new ApiError('You do not have permission to do this.', 403)
  if (response.status === 400 && problem?.errors) {
    const fieldErrors: Record<string, string> = {}
    for (const error of problem.errors) {
      const field = error.source?.pointer?.replace(/^\//, '')
      if (field) fieldErrors[field] = error.message
    }
    throw new ValidationError(problem.detail ?? 'One or more fields are invalid.', fieldErrors)
  }
  throw new ApiError(problem?.detail ?? `The request failed (HTTP ${response.status}).`, response.status)
}
