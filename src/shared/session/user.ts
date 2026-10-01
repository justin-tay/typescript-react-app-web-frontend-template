import type { LoginUser } from './api'

export const userName = (user: LoginUser) => user.name

export const initials = (user: LoginUser) =>
  userName(user)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** The roles that grant access to a part of administration (backend authorities, minus `ROLE_`). */
export const ADMIN_ROLES = ['USER_MANAGE', 'GROUP_MANAGE'] as const

/** `login-user` lists the caller's authorities with their `ROLE_` prefix, so `USER_MANAGE` is `ROLE_USER_MANAGE`. */
export const hasRole = (user: LoginUser, role: string) => user.roles.includes(`ROLE_${role}`)

/** Whether the person holds any administration role, and so has something to do in `/admin`. */
export const isAdmin = (user: LoginUser) => ADMIN_ROLES.some((role) => hasRole(user, role))
