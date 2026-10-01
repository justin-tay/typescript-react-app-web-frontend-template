import { Button, Menu, MenuItem, MenuSeparator, MenuTrigger } from '@opengovsg/oui'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { removeUser, suspendUser, unsuspendUser, type AppUser } from './api'
import { useMutation } from '@/shared/lib/use-mutation'
import { useCurrentUser } from '@/shared/session/auth-context'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { IconButton } from '@/shared/ui/icon-button'
import { MENU_EDGE_PADDING } from '@/shared/ui/menu-edge-padding'
import { ReasonModal } from '@/shared/ui/reason-modal'

type Pending = 'suspend' | 'unsuspend' | 'remove'

const OWN_ACCOUNT = 'You cannot change your own account.'

/**
 * Suspend or Unsuspend, and optionally Remove, for one user, with the dialogs they open.
 * Every action asks first: suspend and remove for a reason, unsuspend for a confirmation,
 * since it restarts the inactivity clock. Removal is permanent. The list tucks the actions in
 * a row menu, with Remove apart at the bottom; the detail page shows them as text buttons.
 */
export function UserLifecycleActions({
  user,
  variant,
  onChanged,
  onRemoved,
}: {
  user: AppUser
  variant: 'menu' | 'text'
  onChanged: () => void
  onRemoved?: () => void
}) {
  const [pending, setPending] = useState<Pending | null>(null)
  const suspend = useMutation(suspendUser)
  const unsuspend = useMutation(unsuspendUser)
  const remove = useMutation(removeUser)
  // The server refuses an administrator changing their own account, so do not offer it.
  const isSelf = useCurrentUser().username === user.username
  const isSuspended = user.status === 'suspended'

  return (
    <>
      {variant === 'menu' ? (
        <MenuTrigger>
          <IconButton
            icon={MoreHorizontal}
            label={isSelf ? `${OWN_ACCOUNT} Actions are unavailable.` : `Actions for ${user.username}`}
            isDisabled={isSelf}
          />
          <Menu
            classNames={{ popover: 'min-w-44' }}
            // Keeps a closing menu from flashing a horizontal scrollbar; see MENU_EDGE_PADDING.
            containerPadding={MENU_EDGE_PADDING}
            className="outline-none"
            onAction={(key) => setPending(key as Pending)}
          >
            {isSuspended ? <MenuItem id="unsuspend">Unsuspend</MenuItem> : <MenuItem id="suspend">Suspend</MenuItem>}
            <MenuSeparator />
            <MenuItem id="remove" className="text-interaction-critical-default">
              Remove
            </MenuItem>
          </Menu>
        </MenuTrigger>
      ) : (
        <>
          <Button variant="clear" isDisabled={isSelf} onPress={() => setPending(isSuspended ? 'unsuspend' : 'suspend')}>
            {isSuspended ? 'Unsuspend' : 'Suspend'}
          </Button>
          <Button variant="clear" color="critical" isDisabled={isSelf} onPress={() => setPending('remove')}>
            Remove
          </Button>
        </>
      )}
      <ReasonModal
        isOpen={pending === 'suspend'}
        onOpenChange={(open) => !open && setPending(null)}
        title="Suspend user"
        description={`Suspend "${user.username}"? They are signed out and cannot sign in until unsuspended.`}
        confirmLabel="Suspend"
        isConfirming={suspend.isSubmitting}
        error={suspend.error?.message}
        onConfirm={async (reason) => {
          if ((await suspend.run(user.id, reason)).ok) {
            setPending(null)
            onChanged()
          }
        }}
      />
      <ConfirmModal
        isOpen={pending === 'unsuspend'}
        onOpenChange={(open) => !open && setPending(null)}
        title="Unsuspend user"
        description={`Unsuspend "${user.username}"? They can sign in again, and their inactivity period starts again from now.`}
        confirmLabel="Unsuspend"
        isCritical={false}
        isConfirming={unsuspend.isSubmitting}
        error={unsuspend.error?.message}
        onConfirm={async () => {
          if ((await unsuspend.run(user.id)).ok) {
            setPending(null)
            onChanged()
          }
        }}
      />
      <ReasonModal
        isOpen={pending === 'remove'}
        onOpenChange={(open) => !open && setPending(null)}
        title="Remove user"
        description={`Permanently remove "${user.username}", their group memberships and passkeys? This cannot be undone; only the audit trail is kept.`}
        confirmLabel="Remove"
        isCritical
        isConfirming={remove.isSubmitting}
        error={remove.error?.message}
        onConfirm={async (reason) => {
          if ((await remove.run(user.id, reason)).ok) {
            setPending(null)
            onChanged()
            onRemoved?.()
          }
        }}
      />
    </>
  )
}
