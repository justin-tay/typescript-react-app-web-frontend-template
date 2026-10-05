import {
  Badge,
  Button,
  Infobox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  TagField,
} from '@opengovsg/oui'
import { useState } from 'react'
import { editGroups, listAssignableGroups, type AssignableGroup, type ReviewItem } from './api'
import { useMutation } from '@/shared/lib/use-mutation'
import { useResource } from '@/shared/lib/use-resource'

export interface EditGroupsModalProps {
  /** The row being edited; the dialog is closed while this is null. */
  item: ReviewItem | null
  taskId: string
  onClose: () => void
  /** The groups were saved, which also confirmed the row. */
  onSaved: () => void
}

/** Sets the full set of groups of one active account. Saving confirms the row in the same step. */
export function EditGroupsModal({ item, taskId, onClose, onSaved }: EditGroupsModalProps) {
  return (
    <Modal isOpen={item !== null} onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        {(close) =>
          item && <EditGroupsForm key={item.id} item={item} taskId={taskId} close={close} onSaved={onSaved} />
        }
      </ModalContent>
    </Modal>
  )
}

function EditGroupsForm({
  item,
  taskId,
  close,
  onSaved,
}: {
  item: ReviewItem
  taskId: string
  close: () => void
  onSaved: () => void
}) {
  const groups = useResource(listAssignableGroups, [])
  return (
    <>
      <ModalHeader>Edit groups</ModalHeader>
      {groups.status === 'loading' && (
        <ModalBody>
          <Spinner aria-label="Loading groups" />
        </ModalBody>
      )}
      {groups.status === 'error' && (
        <ModalBody>
          <Infobox variant="error">{groups.error.message}</Infobox>
        </ModalBody>
      )}
      {groups.status === 'loaded' && (
        <GroupsPicker item={item} taskId={taskId} assignable={groups.data} close={close} onSaved={onSaved} />
      )}
    </>
  )
}

function GroupsPicker({
  item,
  taskId,
  assignable,
  close,
  onSaved,
}: {
  item: ReviewItem
  taskId: string
  assignable: AssignableGroup[]
  close: () => void
  onSaved: () => void
}) {
  // A row carries group names, not ids, so the current groups are matched to the assignable ones by name.
  const initial = assignable.filter(({ name }) => item.groups.includes(name)).map(({ id }) => id)
  const locked = item.groups.filter((name) => !assignable.some((group) => group.name === name))
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial))
  const mutation = useMutation(editGroups)

  const unchanged = selected.size === initial.length && initial.every((id) => selected.has(id))
  const empty = selected.size === 0

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if ((await mutation.run(taskId, item.id, [...selected])).ok) onSaved()
      }}
    >
      <ModalBody className="flex flex-col gap-4">
        <p>
          Change the groups of <strong>{item.name}</strong> ({item.username}). Saving also confirms this account as
          reviewed.
        </p>
        {mutation.error && <Infobox variant="error">{mutation.error.message}</Infobox>}
        <TagField<AssignableGroup>
          label="Groups"
          items={assignable}
          itemToKey={(group) => group.id}
          itemToText={(group) => group.name}
          selectedKeys={selected}
          onSelectionChange={(keys) => setSelected(new Set([...keys].map(String)))}
          // A reviewer's assignable groups are a short list, so it needs no virtual scrolling.
          isVirtualized={false}
          isRequired
          isInvalid={empty}
          errorMessage={empty ? 'Choose at least one group.' : undefined}
        />
        {locked.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Groups you cannot assign</p>
            <ul className="flex flex-wrap gap-2" aria-label="Groups you cannot assign">
              {locked.map((name) => (
                <li key={name}>
                  <Badge color="neutral">{name}</Badge>
                </li>
              ))}
            </ul>
            <Infobox variant="warning">
              This account also holds the groups above, which need a role you do not hold. They cannot be kept from this
              dialog: saving replaces all of the account&apos;s groups with the ones chosen here.
            </Infobox>
          </div>
        )}
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
