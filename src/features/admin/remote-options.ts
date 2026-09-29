import { listGroups, listRoles } from './api'
import type { SearchOptions } from '@/shared/ui/remote-picker'

/** Groups whose name matches what was typed, for the pickers. */
export const searchGroups: SearchOptions = async ({ search, size }) => {
  const page = await listGroups({ page: 0, size, sort: ['name,asc'], search })
  return { items: page.items.map(({ id, name }) => ({ id, name })), totalItems: page.totalItems }
}

/** Roles whose name matches what was typed, for the picker. */
export const searchRoles: SearchOptions = async ({ search, size }) => {
  const page = await listRoles({ page: 0, size, sort: ['name,asc'], search })
  return { items: page.items.map(({ id, name }) => ({ id, name })), totalItems: page.totalItems }
}
