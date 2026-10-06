import type { PermissionSummary } from './api'

/** "5 permissions, 2 privileged" for a role's row. */
export function PermissionCount({ permissions }: { permissions: PermissionSummary[] }) {
  const privileged = permissions.filter((permission) => permission.privileged).length
  const total = `${permissions.length} ${permissions.length === 1 ? 'permission' : 'permissions'}`
  return <>{privileged > 0 ? `${total}, ${privileged} privileged` : total}</>
}
