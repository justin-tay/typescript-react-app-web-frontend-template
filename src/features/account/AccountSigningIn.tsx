import { Button, Infobox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, TextField } from '@opengovsg/oui'
import { useEffect, useState } from 'react'
import { deletePasskey, listPasskeys, renamePasskey, type Passkey } from './api'
import { isWebAuthnSupported, registerPasskey } from './webauthn'
import { ApiError } from '@/shared/lib/api-errors'
import { useMutation } from '@/shared/lib/use-mutation'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { PageHeader } from '@/shared/ui/page-header'

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

interface AddPasskeyModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAdded: () => void
}

function AddPasskeyModal({ isOpen, onOpenChange, onAdded }: AddPasskeyModalProps) {
  const [label, setLabel] = useState('')
  const { run, error, isSubmitting, clearError } = useMutation(registerPasskey)

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (open) setLabel('')
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

type PasskeysState =
  | { status: 'loading' }
  | { status: 'loaded'; items: Passkey[] }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

export function AccountSigningIn() {
  const [state, setState] = useState<PasskeysState>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [renaming, setRenaming] = useState<Passkey | null>(null)
  const [deleting, setDeleting] = useState<Passkey | null>(null)
  const deleteMutation = useMutation(deletePasskey)

  useEffect(() => {
    let cancelled = false
    listPasskeys().then(
      (items) => !cancelled && setState({ status: 'loaded', items }),
      (e: unknown) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 404) {
          setState({ status: 'unavailable' })
        } else {
          setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const reload = () => setReloadToken((t) => t + 1)

  return (
    <section className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Signing in" subtitle="Configure ways to sign in." />
      <p className="text-base-content-medium">
        Passkeys let you sign in to this application directly, without going through your identity provider.
      </p>

      {state.status === 'error' && <Infobox variant="error">{state.message}</Infobox>}
      {state.status === 'unavailable' && (
        <Infobox variant="info">Passkeys are not enabled for this application.</Infobox>
      )}

      {state.status === 'loaded' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Passkeys</h2>
            <Button onPress={() => setIsAddOpen(true)} isDisabled={!isWebAuthnSupported()}>
              Add a passkey
            </Button>
          </div>
          {!isWebAuthnSupported() && <Infobox variant="warning">This browser does not support passkeys.</Infobox>}
          {state.items.length === 0 ? (
            <p className="text-base-content-medium">You have no passkeys yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {state.items.map((passkey) => (
                <li
                  key={passkey.id}
                  className="flex items-center justify-between rounded-lg border border-base-divider-medium px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{passkey.label}</p>
                    <p className="text-sm text-base-content-medium">
                      Added {formatDate(passkey.created)} · Last used {formatDate(passkey.lastUsed)}
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
        onOpenChange={(open) => !open && setDeleting(null)}
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
