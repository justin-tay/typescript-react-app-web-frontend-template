import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@opengovsg/oui'
import { useSessionTimeout } from '../auth/use-session-timeout'

function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${seconds} second${seconds === 1 ? '' : 's'}`
}

/**
 * The idle-timeout warning, kept in sync across every open tab (see
 * `auth/session-timeout.ts`). Mounted once, near the app root, for as long as someone is
 * signed in — see `SessionTimeoutController`.
 */
export function SessionTimeoutModal() {
  const { isPrompted, remainingMs, extendError, extendNow } = useSessionTimeout()

  return (
    <Modal isOpen={isPrompted} isDismissable={false}>
      <ModalContent>
        <ModalHeader>You'll be signed out soon</ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          {extendError && <Infobox variant="error">{extendError}</Infobox>}
          <p>
            You have been inactive for a while. For your security, you'll be signed out in{' '}
            {formatRemaining(remainingMs)} unless you choose to stay signed in.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button onPress={extendNow}>Stay signed in</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
