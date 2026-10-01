import { SearchField } from '@opengovsg/oui'
import { useState, type ReactNode } from 'react'
import { useDebouncedCommit } from '@/shared/lib/use-debounced-commit'

export interface DataTableToolbarProps {
  /** The committed search text; the box starts with it (for state restored after a refresh). */
  search: string
  onSearchChange: (search: string) => void
  searchLabel: string
  searchPlaceholder?: string
  /** Filters, shown beside the search box. */
  children?: ReactNode
}

/** A search box that reports its text once typing pauses, with room for filters beside it. */
export function DataTableToolbar({
  search,
  onSearchChange,
  searchLabel,
  searchPlaceholder,
  children,
}: DataTableToolbarProps) {
  const [text, setText] = useState(search)

  useDebouncedCommit(text, (typed) => onSearchChange(typed.trim()))

  return (
    <div className="filter-row">
      <SearchField
        aria-label={searchLabel}
        inputProps={{ placeholder: searchPlaceholder }}
        value={text}
        onChange={setText}
        className="w-full sm:max-w-sm"
      />
      {children}
    </div>
  )
}
