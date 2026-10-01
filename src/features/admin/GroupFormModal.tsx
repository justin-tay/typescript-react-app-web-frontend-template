import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useEffect, useState } from 'react'
import { createGroup, updateGroup, type AppGroup } from './api'
import { searchRoles } from './remote-options'
import { useMutation } from '@/shared/lib/use-mutation'
import { RemoteTagField, type RemoteOption } from '@/shared/ui/remote-picker'

export interface GroupFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  group: AppGroup | null
  onSaved: () => void
}

export function GroupFormModal({ isOpen, onOpenChange, group, onSaved }: GroupFormModalProps) {
  const [name, setName] = useState('')
  const [roles, setRoles] = useState<RemoteOption[]>([])
  const create = useMutation(createGroup)
  const update = useMutation((id: string, data: { name: string; roleIds: string[] }) => updateGroup(id, data))
  const mutation = group ? update : create

  useEffect(() => {
    if (isOpen) {
      setName(group?.name ?? '')
      setRoles(group?.roles.map(({ id, displayName }) => ({ id, name: displayName })) ?? [])
      mutation.clearError()
    }
    // Only reset when the modal opens for a (possibly different) group.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, group])

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const data = { name, roleIds: roles.map((role) => role.id) }
              const result = group ? await update.run(group.id, data) : await create.run(data)
              if (result.ok) {
                onSaved()
                close()
              }
            }}
          >
            <ModalHeader>{group ? `Edit ${group.name}` : 'New group'}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {mutation.error && !mutation.error.fieldErrors && (
                <Infobox variant="error">{mutation.error.message}</Infobox>
              )}
              <TextField
                label="Name"
                value={name}
                onChange={setName}
                isRequired
                errorMessage={mutation.error?.fieldErrors?.name}
                isInvalid={Boolean(mutation.error?.fieldErrors?.name)}
              />
              <RemoteTagField label="Roles" selected={roles} onChange={setRoles} searchOptions={searchRoles} />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={mutation.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={mutation.isSubmitting}>
                {group ? 'Save' : 'Create'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
