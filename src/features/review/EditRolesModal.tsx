import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TagField } from '@opengovsg/oui'
import { useState } from 'react'
import { editRoles, type ReviewItem } from './api'

type HeldRole = { id: string; name: string }
import { UserCard } from './UserCard'
import { useMutation } from '@/shared/lib/use-mutation'

export interface EditRolesModalProps {
  /** The row being edited; the dialog is closed while this is null. */
  item: ReviewItem | null
  taskId: string
  onClose: () => void
  /** The roles were saved, which also confirmed the row. */
  onSaved: () => void
}

/** Takes roles away from one active account. Saving confirms the row in the same step. */
export function EditRolesModal({ item, taskId, onClose, onSaved }: EditRolesModalProps) {
  return (
    <Modal isOpen={item !== null} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        {(close) =>
          item && (
            <>
              <ModalHeader>Edit roles</ModalHeader>
              <RolesPicker
                key={item.id}
                item={item}
                taskId={taskId}
                held={item.currentRoles ?? []}
                close={close}
                onSaved={onSaved}
              />
            </>
          )
        }
      </ModalContent>
    </Modal>
  )
}

function RolesPicker({
  item,
  taskId,
  held,
  close,
  onSaved,
}: {
  item: ReviewItem
  taskId: string
  held: HeldRole[]
  close: () => void
  onSaved: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(held.map(({ id }) => id)))
  const mutation = useMutation(editRoles)

  const unchanged = selected.size === held.length
  const empty = selected.size === 0

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if ((await mutation.run(taskId, item.id, [...selected])).ok) onSaved()
      }}
    >
      <ModalBody className="flex flex-col gap-4">
        <UserCard name={item.name} username={item.username} department={item.department} bordered />
        <p>
          Take away the roles this person should no longer hold. A reviewer cannot add a role. Saving also confirms the
          account as reviewed.
        </p>
        {mutation.error && <Infobox variant="error">{mutation.error.message}</Infobox>}

        <TagField<HeldRole>
          label="Roles to keep"
          items={held}
          itemToKey={(role) => role.id}
          itemToText={(role) => role.name}
          selectedKeys={selected}
          onSelectionChange={(keys) => setSelected(new Set([...keys].map(String)))}
          // Only the roles the account holds are offered: a short list that needs no virtual scrolling.
          isVirtualized={false}
          isRequired
          isInvalid={empty}
          errorMessage={empty ? 'Keep at least one role, or remove the account instead.' : undefined}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onPress={close} isDisabled={mutation.isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isDisabled={mutation.isSubmitting || unchanged || empty}>
          Save and confirm
        </Button>
      </ModalFooter>
    </form>
  )
}
