import type { LoginUser } from './api'

export const userName = (user: LoginUser) => user.name

export const initials = (user: LoginUser) =>
  userName(user)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/**
 * The roles that grant access to a part of the administration section (backend authorities,
 * minus `ROLE_`): managing users and groups, reviewing accounts, and changing settings.
 */
export const ADMIN_ROLES = ['USER_MANAGE', 'GROUP_MANAGE', 'ACCOUNT_REVIEWER', 'SETTINGS_MANAGE'] as const

/** An administration role by name, so a misspelt one is a compile error instead of a menu that never shows. */
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const hasAnyRole = (user: LoginUser, roles: readonly AdminRole[]) => roles.some((role) => hasRole(user, role))

/** `login-user` lists the caller's authorities with their `ROLE_` prefix, so `USER_MANAGE` is `ROLE_USER_MANAGE`. */
export const hasRole = (user: LoginUser, role: AdminRole) => user.roles.includes(`ROLE_${role}`)

/** Whether the person holds any administration role, and so has something to do in `/admin`. */
export const isAdmin = (user: LoginUser) => hasAnyRole(user, ADMIN_ROLES)
