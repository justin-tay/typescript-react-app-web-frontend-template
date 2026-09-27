import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@opengovsg/oui'

export interface ConfirmModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  isConfirming?: boolean
  error?: string
  onConfirm: () => void
}

/** A destructive-action confirmation, used for every admin delete. */
export function ConfirmModal({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  isConfirming,
  error,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <>
            <ModalHeader>{title}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              <p>{description}</p>
              {error && <Infobox variant="error">{error}</Infobox>}
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={isConfirming}>
                Cancel
              </Button>
              <Button color="critical" onPress={onConfirm} isDisabled={isConfirming}>
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}
