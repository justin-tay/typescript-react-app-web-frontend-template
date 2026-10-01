import { Avatar, Button, Menu, MenuItem, MenuSeparator, MenuTrigger } from '@opengovsg/oui'
import { KeyRound, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { LoginUser } from '@/shared/session/api'
import { useAuth } from '@/shared/session/auth-context'
import { initials, userName } from '@/shared/session/user'

/**
 * The account menu. `accountBase` is where the person's own account pages live in the current
 * section (`/account`, or `/admin/account` inside administration).
 */
export function UserMenu({ user, accountBase }: { user: LoginUser; accountBase: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <MenuTrigger>
      <Button variant="clear" aria-label={`Account menu for ${userName(user)}`}>
        <Avatar.Root>
          <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
        </Avatar.Root>
      </Button>
      <Menu
        onAction={(key) => {
          if (key === 'personal-info') void navigate(`${accountBase}/personal-info`)
          if (key === 'signing-in') void navigate(`${accountBase}/signing-in`)
          if (key === 'logout') void signOut()
        }}
      >
        <MenuItem id="personal-info" className="flex items-center gap-2">
          <User size={16} aria-hidden="true" />
          Personal info
        </MenuItem>
        <MenuItem id="signing-in" className="flex items-center gap-2">
          <KeyRound size={16} aria-hidden="true" />
          Sign-in methods
        </MenuItem>
        <MenuSeparator />
        <MenuItem id="logout" className="flex items-center gap-2">
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </MenuItem>
      </Menu>
    </MenuTrigger>
  )
}
