import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { RemoteComboBox } from './RemoteComboBox'
import { RemoteTagField } from './RemoteTagField'
import type { RemoteOption, SearchOptions } from './use-remote-options'

const ALL: RemoteOption[] = Array.from({ length: 134 }, (_, i) => ({
  id: String(i + 1),
  name: `Group ${String(i + 1).padStart(3, '0')}`,
}))

/** Stands in for the server: matches by name and returns only the first `size`. */
const searchOptions: SearchOptions = async ({ search, size }) => {
  const matches = ALL.filter((option) => option.name.toLowerCase().includes(search.toLowerCase()))
  return { items: matches.slice(0, size), totalItems: matches.length }
}

const meta: Meta = { title: 'Shared/Remote pickers' }

export default meta
type Story = StoryObj

function TagFieldExample() {
  const [selected, setSelected] = useState<RemoteOption[]>([ALL[0]])
  return (
    <div className="max-w-md">
      <RemoteTagField label="Groups" selected={selected} onChange={setSelected} searchOptions={searchOptions} />
    </div>
  )
}

function ComboBoxExample() {
  const [selected, setSelected] = useState<RemoteOption | null>(null)
  return (
    <div className="max-w-xs">
      <RemoteComboBox
        label="Group"
        placeholder="All groups"
        selected={selected}
        onChange={setSelected}
        searchOptions={searchOptions}
      />
    </div>
  )
}

export const TagField: Story = { render: () => <TagFieldExample /> }

export const ComboBox: Story = { render: () => <ComboBoxExample /> }
