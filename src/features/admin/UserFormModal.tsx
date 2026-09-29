import {
  Button,
  Infobox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  TextField,
  Toggle,
} from '@opengovsg/oui'
import { useEffect, useState } from 'react'
import { createUser, updateUser, type AppUser } from './api'
import { searchGroups } from './remote-options'
import { useMutation } from '@/shared/lib/use-mutation'
import { RemoteTagField, type RemoteOption } from '@/shared/ui/remote-picker'

export interface UserFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: AppUser | null
  onSaved: () => void
}

export function UserFormModal({ isOpen, onOpenChange, user, onSaved }: UserFormModalProps) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [groups, setGroups] = useState<RemoteOption[]>([])
  const create = useMutation(createUser)
  const update = useMutation(
    (id: string, data: { name: string; email: string; enabled: boolean; groupIds: string[] }) => updateUser(id, data),
  )
  const mutation = user ? update : create

  useEffect(() => {
    if (isOpen) {
      setUsername(user?.username ?? '')
      setName(user?.name ?? '')
      setEmail(user?.email ?? '')
      setEnabled(user?.enabled ?? true)
      setGroups(user?.groups ?? [])
      mutation.clearError()
    }
    // Only reset when the modal opens for a (possibly different) user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user])

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const data = { name, email, enabled, groupIds: groups.map((group) => group.id) }
              const result = user ? await update.run(user.id, data) : await create.run({ username, ...data })
              if (result.ok) {
                onSaved()
                close()
              }
            }}
          >
            <ModalHeader>{user ? `Edit ${user.username}` : 'New user'}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {mutation.error && !mutation.error.fieldErrors && (
                <Infobox variant="error">{mutation.error.message}</Infobox>
              )}
              {user ? (
                <TextField label="Username" value={username} isDisabled />
              ) : (
                <TextField
                  label="Username"
                  value={username}
                  onChange={setUsername}
                  isRequired
                  description="Must match the user's Keycloak preferred_username, and cannot be changed later."
                  errorMessage={mutation.error?.fieldErrors?.username}
                  isInvalid={Boolean(mutation.error?.fieldErrors?.username)}
                />
              )}
              {user ? (
                <>
                  <TextField
                    label="Name"
                    value={name}
                    isDisabled
                    description="Comes from the identity provider; the admin console does not change it."
                  />
                  <TextField label="Email" value={email} isDisabled />
                </>
              ) : (
                <>
                  <TextField
                    label="Name"
                    value={name}
                    onChange={setName}
                    isRequired
                    description="A placeholder until the person first logs in through the identity provider."
                    errorMessage={mutation.error?.fieldErrors?.name}
                    isInvalid={Boolean(mutation.error?.fieldErrors?.name)}
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    isRequired
                    errorMessage={mutation.error?.fieldErrors?.email}
                    isInvalid={Boolean(mutation.error?.fieldErrors?.email)}
                  />
                </>
              )}
              <Toggle isSelected={enabled} onChange={setEnabled}>
                Enabled
              </Toggle>
              <RemoteTagField label="Groups" selected={groups} onChange={setGroups} searchOptions={searchGroups} />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={mutation.isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={mutation.isSubmitting}>
                {user ? 'Save' : 'Create'}
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
