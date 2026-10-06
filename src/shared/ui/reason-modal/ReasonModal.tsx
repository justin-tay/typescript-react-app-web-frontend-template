import {
  Button,
  Infobox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  TextField,
} from '@opengovsg/oui'
import { useState, type ReactNode } from 'react'
import { NOTE_MAX_LENGTH, REASON_OPTIONS, type ReasonCode } from './reason-codes'

export interface ReasonModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  description: ReactNode
  /** Shows the description as a red warning banner, for a change that cannot be undone. */
  descriptionIsWarning?: boolean
  /** Shown under the description, for example who the change is for. */
  summary?: ReactNode
  confirmLabel: string
  isCritical?: boolean
  isConfirming?: boolean
  error?: string
  onConfirm: (reason: { reasonCode: ReasonCode; note?: string }) => void
}

/** Asks for a reason code and an optional note before a suspend or remove. */
export function ReasonModal(props: ReasonModalProps) {
  // Remount the form each time the dialog opens so it starts empty.
  return <ReasonModalForm key={String(props.isOpen)} {...props} />
}

function ReasonModalForm({
  isOpen,
  onOpenChange,
  title,
  description,
  descriptionIsWarning,
  summary,
  confirmLabel,
  isCritical,
  isConfirming,
  error,
  onConfirm,
}: ReasonModalProps) {
  const [reasonCode, setReasonCode] = useState<ReasonCode | null>(null)
  const [note, setNote] = useState('')

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (reasonCode) onConfirm({ reasonCode, note: note.trim() || undefined })
            }}
          >
            <ModalHeader>{title}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {descriptionIsWarning ? <Infobox variant="error">{description}</Infobox> : <p>{description}</p>}
              {summary}
              {error && <Infobox variant="error">{error}</Infobox>}
              <Select
                label="Reason"
                isRequired
                placeholder="Select a reason"
                value={reasonCode}
                onChange={(key) => setReasonCode(key as ReasonCode | null)}
              >
                {REASON_OPTIONS.map(({ id, label }) => (
                  <SelectItem key={id} id={id}>
                    {label}
                  </SelectItem>
                ))}
              </Select>
              <TextField
                label="Note (optional)"
                value={note}
                onChange={setNote}
                maxLength={NOTE_MAX_LENGTH}
                description={`${note.length}/${NOTE_MAX_LENGTH}`}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={isConfirming}>
                Cancel
              </Button>
              <Button
                type="submit"
                color={isCritical ? 'critical' : undefined}
                isDisabled={isConfirming || !reasonCode}
              >
                {confirmLabel}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
