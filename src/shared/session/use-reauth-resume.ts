import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './auth-context'
import { registerReauthForm } from './reauth'
import { clearReauthDraft, peekReauthDraft } from './reauth-stash'

export const RESUMING_NOTICE = "You're signed in again. Submitting your change…"
export const REFUSED_NOTICE =
  "You're signed in again, but your change couldn't be saved. Fix the errors below and submit again."
export const DIFFERENT_USER_NOTICE = "You signed in as a different user, so your change wasn't submitted."

interface Options<TDraft> {
  /** What to keep if signing in again at the provider takes the browser away. */
  getDraft: () => TDraft
  /** Called once on return, for the same person: reopen with `draft` and submit it. */
  onResume: (draft: TDraft) => void
  /** False while the form is not on screen, so it is not the one saved. Defaults to true. */
  isActive?: boolean
  /** Shown on return instead of saying the change is being submitted, for a form that waits for the person. */
  resumedNotice?: string
}

/**
 * For a form that makes sensitive changes (see `reauth.ts`). While on screen it tells the
 * reauthentication dialog what to save; when the browser comes back from signing in again, it
 * is handed that draft once, provided the same person signed in. Render `notice` in the form,
 * and call `finish(ok)` with the result of the resubmit so the notice stays true.
 */
export function useReauthResume<TDraft>(key: string, options: Options<TDraft>) {
  const { state } = useAuth()
  const userId = state.status === 'authenticated' ? state.user.id : null
  const isActive = options.isActive ?? true
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })
  const [notice, setNotice] = useState<string | null>(() => {
    const saved = peekReauthDraft()
    if (saved?.key !== key || userId === null) return null
    return saved.userId === userId ? (options.resumedNotice ?? RESUMING_NOTICE) : DIFFERENT_USER_NOTICE
  })

  useEffect(() => (isActive ? registerReauthForm(key, () => latest.current.getDraft()) : undefined), [key, isActive])

  useEffect(() => {
    if (userId === null) return
    const saved = peekReauthDraft()
    if (saved?.key !== key) return
    clearReauthDraft()
    if (saved.userId === userId) latest.current.onResume(saved.draft as TDraft)
  }, [key, userId])

  const finish = useCallback((ok: boolean) => setNotice(ok ? null : REFUSED_NOTICE), [])
  return { notice, finish }
}
