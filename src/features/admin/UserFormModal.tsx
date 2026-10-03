import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useEffect, useRef, useState } from 'react'
import { createUser, updateUser, type AppUser } from './api'
import { searchGroups } from './remote-options'
import { useMutation } from '@/shared/lib/use-mutation'
import { useCurrentUser } from '@/shared/session/auth-context'
import { useReauthResume } from '@/shared/session/use-reauth-resume'
import { hasRole } from '@/shared/session/user'
import { RemoteTagField, type RemoteOption } from '@/shared/ui/remote-picker'

export interface UserFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: AppUser | null
  /** Opens the form again, for `user` (null: a new one), when the browser is back from signing in again. */
  onReopen: (user: AppUser | null) => void
  onSaved: () => void
}

interface UserDraft {
  user: AppUser | null
  username: string
  name: string
  email: string
  groups: RemoteOption[]
}

export function UserFormModal({ isOpen, onOpenChange, user, onReopen, onSaved }: UserFormModalProps) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [groups, setGroups] = useState<RemoteOption[]>([])
  // Choosing groups searches them, which needs the groups role; without it the user's groups are kept as they are.
  const canPickGroups = hasRole(useCurrentUser(), 'GROUP_MANAGE')
  const create = useMutation(createUser)
  const update = useMutation((id: string, data: { name: string; email: string; groupIds: string[] }) =>
    updateUser(id, data),
  )
  const mutation = user ? update : create

  const save = async (values: UserDraft) => {
    const data = { name: values.name, email: values.email, groupIds: values.groups.map((group) => group.id) }
    const result = values.user
      ? await update.run(values.user.id, data)
      : await create.run({ username: values.username, ...data })
    if (result.ok) {
      onSaved()
      onOpenChange(false)
    }
    return result.ok
  }

  // Signing in again for this change took the browser away: it comes back with what was typed,
  // reopens the form and submits it (see `use-reauth-resume.ts`).
  const resume = useReauthResume<UserDraft>('admin-user-form', {
    getDraft: () => ({ user, username, name, email, groups }),
    onResume: (draft) => {
      resuming.current = draft
      onReopen(draft.user)
    },
    isActive: isOpen,
  })
  const resuming = useRef<UserDraft | null>(null)

  useEffect(() => {
    if (isOpen) {
      const draft = resuming.current
      resuming.current = null
      setUsername(draft?.username ?? user?.username ?? '')
      setName(draft?.name ?? user?.name ?? '')
      setEmail(draft?.email ?? user?.email ?? '')
      setGroups(draft?.groups ?? user?.groups ?? [])
      mutation.clearError()
      if (draft) void save(draft).then(resume.finish)
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
              await save({ user, username, name, email, groups })
            }}
          >
            <ModalHeader>{user ? `Edit ${user.username}` : 'New user'}</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {resume.notice && <Infobox variant="info">{resume.notice}</Infobox>}
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
              {canPickGroups && (
                <RemoteTagField label="Groups" selected={groups} onChange={setGroups} searchOptions={searchGroups} />
              )}
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
