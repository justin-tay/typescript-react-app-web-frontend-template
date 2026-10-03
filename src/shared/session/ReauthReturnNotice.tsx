import { Infobox } from '@opengovsg/oui'
import { useState } from 'react'
import { clearReauthDraft, peekReauthDraft } from './reauth-stash'

/**
 * Tells the person, after signing in again, to repeat a sensitive change whose form had no way
 * to be restored (it saved no draft of its own). A form that does restore itself is left alone:
 * it speaks for itself (see `use-reauth-resume.ts`).
 */
export function ReauthReturnNotice() {
  const [show] = useState(() => {
    const saved = peekReauthDraft()
    if (saved?.key !== '') return false
    clearReauthDraft()
    return true
  })
  if (!show) return null
  return (
    <div role="status" className="px-6 pt-4">
      <Infobox variant="info">You're signed in again. Please repeat your change.</Infobox>
    </div>
  )
}
