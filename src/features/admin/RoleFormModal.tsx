import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useEffect, useState } from 'react'
import { createRole, updateRole, type AppRole } from './api'
import { searchPermissions } from './remote-options'
import { useMutation } from '@/shared/lib/use-mutation'
import { RemoteTagField, type RemoteOption } from '@/shared/ui/remote-picker'

export interface RoleFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  role: AppRole | null
  onSaved: () => void
}

export function RoleFormModal({ isOpen, onOpenChange, role, onSaved }: RoleFormModalProps) {
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<RemoteOption[]>([])
  const create = useMutation(createRole)
  const update = useMutation((id: string, data: { name: string; permissionIds: string[] }) => updateRole(id, data))
  const mutation = role ? update : create

  useEffect(() => {
    if (isOpen) {
      setName(role?.name ?? '')
      setPermissions(
        role?.permissions.map((p) => ({ id: p.id, name: p.name + (p.privileged ? ' (privileged)' : '') })) ?? [],
      )
      mutation.clearError()
    }
    // Only reset when the modal opens for a (possibly different) role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, role])

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const data = { name, permissionIds: permissions.map((permission) => permission.id) }
              const result = role ? await update.run(role.id, data) : await create.run(data)
              if (result.ok) {
                onSaved()
                close()
              }
            }}
          >
            <ModalHeader>{role ? `Edit ${role.name}` : 'New role'}</ModalHeader>
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
              <RemoteTagField
                label="Permissions"
                selected={permissions}
                onChange={setPermissions}
                searchOptions={searchPermissions}
                errorMessage={mutation.error?.fieldErrors?.permissionIds}
                isInvalid={Boolean(mutation.error?.fieldErrors?.permissionIds)}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={mutation.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={mutation.isSubmitting}>
                {role ? 'Save' : 'Create'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
