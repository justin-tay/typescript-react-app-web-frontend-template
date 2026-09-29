import { useCallback, useState } from 'react'
import { beginReauthentication } from '@/shared/session/reauth'
import { ApiError, ReauthenticationRequiredError, ValidationError } from './api-errors'

export interface MutationError {
  message: string
  fieldErrors?: Record<string, string>
}

export type MutationResult<TResult> = { ok: true; value: TResult } | { ok: false }

/**
 * Wraps a write call (admin CRUD, or an account action like registering a passkey) with
 * the error handling each of their forms needs: a stale login sends the browser off to
 * re-authenticate (see admin/reauth.ts), a validation failure surfaces per-field messages,
 * and anything else becomes one message. `run`'s result is a discriminated `{ok}` rather
 * than the bare value, so a caller can tell success from failure even when the call itself
 * resolves to `void` (a delete).
 */
export function useMutation<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>) {
  const [error, setError] = useState<MutationError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const run = useCallback(
    async (...args: TArgs): Promise<MutationResult<TResult>> => {
      setIsSubmitting(true)
      setError(null)
      try {
        const value = await fn(...args)
        return { ok: true, value }
      } catch (e) {
        if (e instanceof ReauthenticationRequiredError) {
          beginReauthentication(window.location.pathname)
          return { ok: false }
        }
        if (e instanceof ValidationError) {
          setError({ message: e.message, fieldErrors: e.fieldErrors })
        } else {
          setError({ message: e instanceof ApiError || e instanceof Error ? e.message : String(e) })
        }
        return { ok: false }
      } finally {
        setIsSubmitting(false)
      }
    },
    [fn],
  )

  return { run, error, isSubmitting, clearError: () => setError(null) }
}
