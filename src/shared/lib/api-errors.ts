import { declareSignedOut } from '@/shared/session/session-broadcast'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
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
 * docs/adr/0024 in the backend). The caller should send the browser to log in again with
 * `beginReauthentication` from `admin/reauth.ts`.
 */
export class ReauthenticationRequiredError extends ApiError {
  constructor() {
    super('Please log in again to make this change.', 401)
  }
}

interface ProblemDetailBody {
  type?: string
  detail?: string
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

/** Maps one of the backend's RFC 9457 problem responses to the errors above. */
export async function throwForResponse(response: Response): Promise<never> {
  const problem = await readProblem(response)
  if (response.status === 401 && problemType(problem) === 'reauthentication-required') {
    throw new ReauthenticationRequiredError()
  }
  if (response.status === 401) {
    // Reaching here (as opposed to the reauthentication-required branch above) means the
    // session itself is gone, discovered by a call that only ever fires from a page
    // `RequireAuth` already confirmed was authenticated — so this is a real "you were
    // signed in, and now you're not" event, worth telling every open tab about.
    declareSignedOut()
    throw new ApiError('You are not logged in.', 401)
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
