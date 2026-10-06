import type { ReactNode } from 'react'

export interface DescriptionItem {
  label: string
  value: ReactNode
}

/** Label and value pairs, for the facts on a detail page. */
export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
      {items.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="text-sm text-base-content-medium">{label}</dt>
          <dd className="break-words text-base-content-strong">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
