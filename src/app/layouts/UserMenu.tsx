import { Avatar, Button, Menu, MenuItem, MenuTrigger } from '@opengovsg/oui'
import { useNavigate } from 'react-router'
import type { LoginUser } from '@/shared/session/api'
import { useAuth } from '@/shared/session/auth-context'
import { initials, userName } from '@/shared/session/user'

/**
 * The account menu. `showAccount` is false in the admin section: the person's own account
 * lives in the other app (a separate app in a real deployment), so there is nothing to link to.
 */
export function UserMenu({ user, showAccount = true }: { user: LoginUser; showAccount?: boolean }) {
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
          if (key === 'account') void navigate('/account')
          if (key === 'logout') void signOut()
        }}
      >
        {showAccount ? <MenuItem id="account">My account</MenuItem> : null}
        <MenuItem id="logout">Sign out</MenuItem>
      </Menu>
    </MenuTrigger>
  )
}
