import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useEffect, useState } from 'react'
import { deletePasskey, listPasskeys, renamePasskey, type Passkey } from './api'
import { isWebAuthnSupported, registerPasskey } from './webauthn'
import { ApiError } from '@/shared/lib/api-errors'
import { formatDateTime } from '@/shared/lib/format'
import { useMutation } from '@/shared/lib/use-mutation'
import { useResource } from '@/shared/lib/use-resource'
import { useReauthResume } from '@/shared/session/use-reauth-resume'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { PageHeader } from '@/shared/ui/page-header'

interface AddPasskeyModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}

function AddPasskeyModal({ isOpen, onOpenChange, onAdded }: AddPasskeyModalProps) {
  const [label, setLabel] = useState('')
  const { run, error, isSubmitting, clearError } = useMutation(registerPasskey)
  // Adding a passkey needs a recent sign-in. If that takes the browser away, the form comes back
  // with the name typed but does not submit by itself: the browser needs a fresh tap to create one.
  const resume = useReauthResume<{ label: string }>('add-passkey', {
    getDraft: () => ({ label }),
    onResume: (draft) => {
      setLabel(draft.label)
      onOpenChange(true)
    },
    isActive: isOpen,
    resumedNotice: "You're signed in again. Continue adding your passkey.",
  })

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        // Called when the dialog closes (it is opened by the parent), so the next one starts empty.
        if (!open) setLabel('')
        clearError()
        onOpenChange(open)
      }}
    >
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const result = await run(label)
              if (result.ok) {
                onAdded()
                close()
              }
            }}
          >
            <ModalHeader>Add a passkey</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {resume.notice && <Infobox variant="info">{resume.notice}</Infobox>}
              {error && <Infobox variant="error">{error.message}</Infobox>}
              <p className="text-base-content-medium">
                Your browser will ask you to confirm with your device's screen lock, security key, or another passkey
                manager.
              </p>
              <TextField
                label="Name this passkey"
                value={label}
                onChange={setLabel}
                isRequired
                description="For example, the device or authenticator it's on."
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={isSubmitting}>
                Continue
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}

interface RenamePasskeyModalProps {
  passkey: Passkey | null
  onOpenChange: (open: boolean) => void
  onRenamed: () => void
}

function RenamePasskeyModal({ passkey, onOpenChange, onRenamed }: RenamePasskeyModalProps) {
  const [label, setLabel] = useState('')
  const { run, error, isSubmitting, clearError } = useMutation(renamePasskey)

  useEffect(() => {
    if (passkey) {
      setLabel(passkey.label)
      clearError()
    }
    // Only reset when a (possibly different) passkey is opened for renaming.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passkey])

  return (
    <Modal isOpen={passkey !== null} onOpenChange={onOpenChange}>
      <ModalContent>
        {(close) => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!passkey) return
              const result = await run(passkey.id, label)
              if (result.ok) {
                onRenamed()
                close()
              }
            }}
          >
            <ModalHeader>Rename passkey</ModalHeader>
            <ModalBody className="flex flex-col gap-4">
              {error && <Infobox variant="error">{error.message}</Infobox>}
              <TextField label="Name" value={label} onChange={setLabel} isRequired />
            </ModalBody>
            <ModalFooter>
              <Button variant="outline" onPress={close} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" isDisabled={isSubmitting}>
                Save
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}

export function AccountSigningIn() {
  const passkeys = useResource(listPasskeys, [])
  const { reload } = passkeys
  // A 404 means the backend has passkeys switched off, which is not a failure to report.
  const isUnavailable =
    passkeys.status === 'error' && passkeys.error instanceof ApiError && passkeys.error.status === 404
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [renaming, setRenaming] = useState<Passkey | null>(null)
  const [deleting, setDeleting] = useState<Passkey | null>(null)
  const deleteMutation = useMutation(deletePasskey)

  return (
    <section className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Sign-in methods" subtitle="Configure ways to sign in." />
      <p className="text-base-content-medium">
        Passkeys let you sign in to this application directly, without going through your identity provider.
      </p>

      {passkeys.status === 'error' && !isUnavailable && <Infobox variant="error">{passkeys.error.message}</Infobox>}
      {isUnavailable && <Infobox variant="info">Passkeys are not enabled for this application.</Infobox>}

      {passkeys.status === 'loaded' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Passkeys</h2>
            <Button onPress={() => setIsAddOpen(true)} isDisabled={!isWebAuthnSupported()}>
              Add a passkey
            </Button>
          </div>
          {!isWebAuthnSupported() && <Infobox variant="warning">This browser does not support passkeys.</Infobox>}
          {passkeys.data.length === 0 ? (
            <p className="text-base-content-medium">You have no passkeys yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {passkeys.data.map((passkey) => (
                <li
                  key={passkey.id}
                  className="flex items-center justify-between rounded-lg border border-base-divider-medium px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{passkey.label}</p>
                    <p className="text-sm text-base-content-medium">
                      Added {formatDateTime(passkey.created)} · Last used{' '}
                      {passkey.lastUsed ? formatDateTime(passkey.lastUsed) : 'never'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="clear" onPress={() => setRenaming(passkey)}>
                      Rename
                    </Button>
                    <Button variant="clear" color="critical" onPress={() => setDeleting(passkey)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <AddPasskeyModal isOpen={isAddOpen} onOpenChange={setIsAddOpen} onAdded={reload} />
      <RenamePasskeyModal passkey={renaming} onOpenChange={(open) => !open && setRenaming(null)} onRenamed={reload} />
      <ConfirmModal
        isOpen={deleting !== null}
        onOpenChange={(open) => {
          if (open) return
          setDeleting(null)
          deleteMutation.clearError()
        }}
        title="Delete passkey"
        description={`Delete "${deleting?.label}"? You will no longer be able to sign in with it.`}
        isConfirming={deleteMutation.isSubmitting}
        error={deleteMutation.error?.message}
        onConfirm={async () => {
          if (!deleting) return
          const result = await deleteMutation.run(deleting.id)
          if (result.ok) {
            setDeleting(null)
            reload()
          }
        }}
      />
    </section>
  )
}
