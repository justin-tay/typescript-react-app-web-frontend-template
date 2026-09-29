import type { LoginUser } from './api'

export const userName = (user: LoginUser) => user.name

export const initials = (user: LoginUser) =>
  userName(user)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
