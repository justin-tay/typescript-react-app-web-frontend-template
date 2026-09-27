import type { LoginUser } from '../auth/api'

export const displayName = (user: LoginUser) => user.displayName

export const initials = (user: LoginUser) =>
  displayName(user)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
