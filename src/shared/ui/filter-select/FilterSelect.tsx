import { Select, SelectItem } from '@opengovsg/oui'

export interface FilterOption {
  id: string
  label: string
}

export interface FilterSelectProps {
  label: string
  /** The filter's current value; undefined or empty means no filter, shown as the "All" choice. */
  value: string | undefined
  /** Called with the chosen value, or an empty string for "All" (which clears the filter). */
  onChange: (value: string) => void
  /** The choices, without "All": it is always added first. */
  options: readonly FilterOption[]
  allLabel?: string
  /** Width of the field, as a Tailwind class. */
  className?: string
}

const ALL = 'all'

/** A dropdown filter for a list, with an "All" choice that clears the filter. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
  className = 'w-44',
}: FilterSelectProps) {
  return (
    <div className={className}>
      <Select
        label={label}
        // OUI builds the dropdown from its outline button, so out of the box it has a darker border, greyer
        // text and wider padding than the text fields it sits beside in a filter row, and a label a few
        // pixels shorter. These bring it in line with a text field.
        classNames={{
          label: 'min-h-6',
          trigger: 'border-base-divider-strong bg-white px-3 text-base-content',
          selectedText: 'text-base-content',
        }}
        value={value || ALL}
        onChange={(key) => onChange(key === null || key === ALL ? '' : String(key))}
      >
        {[{ id: ALL, label: allLabel }, ...options].map(({ id, label: optionLabel }) => (
          <SelectItem key={id} id={id}>
            {optionLabel}
          </SelectItem>
        ))}
      </Select>
    </div>
  )
}
