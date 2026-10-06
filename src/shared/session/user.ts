import { humanize } from '@/shared/lib/labels'
import type { LoginUser } from './api'

export const userName = (user: LoginUser) => user.name

export const initials = (user: LoginUser) =>
  userName(user)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Every permission the backend seeds, as `domain:action`, so a misspelt one is a compile error instead of a menu that never shows. */
export type Permission =
  | 'user:read'
  | 'user:create'
  | 'user:update'
  | 'user:add-role'
  | 'user:remove-role'
  | 'user:suspend'
  | 'user:unsuspend'
  | 'user:remove'
  | 'user:revoke-session'
  | 'user:remove-passkey'
  | 'role:read'
  | 'role:create'
  | 'role:update'
  | 'role:delete'
  | 'role:add-permission'
  | 'role:remove-permission'
  | 'permission:read'
  | 'settings:read'
  | 'settings:update'
  | 'audit:read'
  | 'review:read'
  | 'review:decide'
  | 'review:confirm-population'
  | 'review:download-report'

/** The domains whose permissions give access to a part of the administration section. */
const ADMIN_DOMAINS = ['user', 'role', 'permission', 'settings', 'audit', 'review']

export const hasPermission = (user: LoginUser, permission: Permission) => user.permissions.includes(permission)

export const hasAnyPermission = (user: LoginUser, permissions: readonly Permission[]) =>
  permissions.some((permission) => hasPermission(user, permission))

/** Whether the person holds any administration permission, and so has something to do in `/admin`. */
export const isAdmin = (user: LoginUser) =>
  user.permissions.some((permission) => ADMIN_DOMAINS.includes(permission.split(':')[0]))

/** A permission (`user:add-role`) in words a person would use ("User: add role"). */
export function permissionLabel(permission: string): string {
  const [domain, ...action] = permission.split(':')
  return action.length === 0 ? humanize(domain) : `${humanize(domain)}: ${humanize(action.join(':')).toLowerCase()}`
}
