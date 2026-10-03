import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@opengovsg/oui'
import { useState, useSyncExternalStore } from 'react'
import { loginWithPasskey } from '@/features/login/webauthn-login'
import { useAuth } from '@/shared/session/auth-context'
import {
  activeReauthForm,
  getReauthRequest,
  settleReauthRequest,
  subscribeReauthRequest,
} from '@/shared/session/reauth'
import { saveReauthDraft } from '@/shared/session/reauth-stash'
import { rememberReturnPath } from '@/shared/session/return-path'

function windowText(maxAgeSeconds: number | undefined): string {
  if (maxAgeSeconds === undefined) return 'recently'
  const minutes = Math.max(1, Math.ceil(maxAgeSeconds / 60))
  return `within the last ${minutes} minute${minutes === 1 ? '' : 's'}`
}

/**
 * Explains why a sensitive change needs a recent sign-in and lets the person do it: at
 * Keycloak (the browser leaves, after the open form is saved so it can be restored) or with a
 * passkey in place. Mounted once, near the app root.
 */
export function ReauthModal() {
  const request = useSyncExternalStore(subscribeReauthRequest, getReauthRequest)
  const { signOut, state } = useAuth()
  const [passkeyError, setPasskeyError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const cancel = () => {
    setPasskeyError(null)
    settleReauthRequest('cancelled')
  }

  const signInAtProvider = (uri: string) => {
    const form = activeReauthForm()
    if (state.status === 'authenticated') {
      // With no form to restore, an empty key still leaves word that a change was interrupted
      // (see `ReauthReturnNotice`).
      saveReauthDraft({ key: form?.key ?? '', userId: state.user.id, draft: form ? form.getDraft() : null })
    }
    rememberReturnPath(window.location.pathname + window.location.search)
    window.location.assign(uri)
  }

  const signInWithPasskey = async () => {
    setIsWorking(true)
    setPasskeyError(null)
    try {
      await loginWithPasskey()
      settleReauthRequest('reauthenticated')
    } catch (e) {
      setPasskeyError(e instanceof Error ? e.message : 'Passkey sign-in did not complete.')
    } finally {
      setIsWorking(false)
    }
  }

  const uri = request?.method === 'oidc' ? request.reauthenticationUri : undefined
  const canConfirm = request?.method === 'passkey' || uri !== undefined

  return (
    <Modal isOpen={request !== null} isDismissable={false}>
      <ModalContent hideCloseButton>
        <ModalHeader>Confirm it's you</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          {passkeyError && <Infobox variant="error">{passkeyError}</Infobox>}
          <p>Changes like this need you to have signed in {windowText(request?.maxAge)}.</p>
          {!canConfirm && (
            <p>We can't confirm it's you from here. Please sign out and sign in again, then repeat your change.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onPress={cancel}>
            Cancel
          </Button>
          {canConfirm ? (
            request?.method === 'passkey' ? (
              <Button isDisabled={isWorking} onPress={() => void signInWithPasskey()}>
                Use passkey
              </Button>
            ) : (
              <Button onPress={() => uri && signInAtProvider(uri)}>Sign in again</Button>
            )
          ) : (
            <Button onPress={() => void signOut()}>Sign out</Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
