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
          if (key === 'profile') void navigate('/profile')
          // /login-user does not report roles, so this link is offered to every signed-in
          // user; a user without USER_MANAGE sees the page's own 403 message instead.
          if (key === 'admin-users') void navigate('/users')
          if (key === 'logout') void signOut()
        }}
      >
        <MenuItem id="profile">Profile</MenuItem>
        <MenuItem id="admin-users">Manage users</MenuItem>
        <MenuItem id="logout">Log out</MenuItem>
      </Menu>
    </MenuTrigger>
  )
}
