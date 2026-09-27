import { Avatar, Button, Menu, MenuItem, MenuTrigger } from '@opengovsg/oui'
import { useNavigate } from 'react-router'
import type { LoginUser } from '../auth/api'
import { useAuth } from '../auth/auth-context'
import { displayName, initials } from './user'

export function UserMenu({ user }: { user: LoginUser }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <MenuTrigger>
      <Button variant="clear" aria-label={`Account menu for ${displayName(user)}`}>
        <Avatar.Root>
          <Avatar.Fallback>{initials(user)}</Avatar.Fallback>
        </Avatar.Root>
      </Button>
      <Menu
        onAction={(key) => {
          if (key === 'account') void navigate('/account')
          // Offered to every signed-in user regardless of roles; a user without
          // USER_MANAGE sees the page's own 403 message instead.
          if (key === 'administration') void navigate('/users')
          if (key === 'logout') void signOut()
        }}
      >
        <MenuItem id="account">My account</MenuItem>
        <MenuItem id="administration">Administration</MenuItem>
        <MenuItem id="logout">Log out</MenuItem>
      </Menu>
    </MenuTrigger>
  )
}
