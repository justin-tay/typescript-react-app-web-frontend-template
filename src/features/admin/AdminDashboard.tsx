import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { listGroups, listUsers } from './api'
import { GROUPS_TABLE, USERS_TABLE } from './table-keys'
import { useCurrentUser } from '@/shared/session/auth-context'
import { hasRole, userName } from '@/shared/session/user'
import { presetTableState } from '@/shared/lib/use-paged-list'
import { PageHeader } from '@/shared/ui/page-header'
import { StatCard } from '@/shared/ui/stat-card'

type Count = number | 'loading' | 'unavailable'

/** Only the total is wanted, so ask for one row. A 403 or any failure reads as unavailable. */
function useTotal(fetchTotal: () => Promise<number>, isAllowed: boolean): Count {
  const [count, setCount] = useState<Count>('loading')
  useEffect(() => {
    if (!isAllowed) return
    let cancelled = false
    fetchTotal().then(
      (total) => !cancelled && setCount(total),
      () => !cancelled && setCount('unavailable'),
    )
    return () => {
      cancelled = true
    }
  }, [fetchTotal, isAllowed])
  return count
}

const usersWhere = (filters: Record<string, string>) => async () =>
  (await listUsers({ page: 0, size: 1, filters })).totalItems

const allUsers = usersWhere({})
const activeUsers = usersWhere({ status: 'active' })
const neverSignedInUsers = usersWhere({ neverSignedIn: 'true' })
const allGroups = async () => (await listGroups({ page: 0, size: 1 })).totalItems

/** A welcome and the headline figures, each opening the list it counts. */
export function AdminDashboard() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const canSeeUsers = hasRole(user, 'USER_MANAGE')
  const canSeeGroups = hasRole(user, 'GROUP_MANAGE')
  const users = useTotal(allUsers, canSeeUsers)
  const active = useTotal(activeUsers, canSeeUsers)
  const neverSignedIn = useTotal(neverSignedInUsers, canSeeUsers)
  const groups = useTotal(allGroups, canSeeGroups)

  const openUsers = (filters: Record<string, string>) => () => {
    presetTableState(USERS_TABLE, filters)
    void navigate('/admin/users')
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={`Welcome, ${userName(user)}`} subtitle="An overview of your users and groups." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {canSeeUsers && (
          <>
            <StatCard label="Total users" value={users} onPress={openUsers({})} />
            <StatCard label="Active users" value={active} onPress={openUsers({ status: 'active' })} />
            <StatCard label="Never signed in" value={neverSignedIn} onPress={openUsers({ neverSignedIn: 'true' })} />
          </>
        )}
        {canSeeGroups && (
          <StatCard
            label="Groups"
            value={groups}
            onPress={() => {
              presetTableState(GROUPS_TABLE, {})
              void navigate('/admin/groups')
            }}
          />
        )}
      </div>
    </section>
  )
}
