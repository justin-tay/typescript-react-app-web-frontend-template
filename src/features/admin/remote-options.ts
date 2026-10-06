import { listPermissions, listRoles } from './api'
import type { SearchOptions } from '@/shared/ui/remote-picker'

/** Roles whose name matches what was typed, for the pickers. */
export const searchRoles: SearchOptions = async ({ search, size }) => {
  const page = await listRoles({ page: 0, size, sort: ['name,asc'], search })
  return { items: page.items.map(({ id, name }) => ({ id, name })), totalItems: page.totalItems }
}

/** A permission as the pickers name it: `user:add-role`, with a note when it is privileged. */
export const permissionOptionName = ({
  domain,
  action,
  privileged,
}: {
  domain: string
  action: string
  privileged: boolean
}) => `${domain}:${action}${privileged ? ' (privileged)' : ''}`

/** Permissions whose name matches what was typed, for the role form. */
export const searchPermissions: SearchOptions = async ({ search, size }) => {
  const page = await listPermissions({ page: 0, size, sort: ['domain,asc', 'action,asc'], search })
  return { items: page.items.map((p) => ({ id: p.id, name: permissionOptionName(p) })), totalItems: page.totalItems }
}
