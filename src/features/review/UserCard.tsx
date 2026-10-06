import { Avatar } from '@opengovsg/oui'

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Who a row or a dialog is about: an avatar with initials, the name and username, and the department. */
export function UserCard({
  name,
  username,
  department,
  bordered,
}: {
  name: string
  username: string
  department?: string | null
  /** A framed card, for a dialog; unframed in a table cell. */
  bordered?: boolean
}) {
  return (
    <div
      className={[
        'flex items-center gap-3',
        bordered ? 'rounded-lg border border-base-divider-medium bg-base-canvas-alt p-3' : '',
      ].join(' ')}
    >
      <Avatar.Root>
        <Avatar.Fallback>{initialsOf(name) || '?'}</Avatar.Fallback>
      </Avatar.Root>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-sm text-base-content-medium">
          {username}
          {department ? `, ${department}` : ''}
        </span>
      </div>
    </div>
  )
}
