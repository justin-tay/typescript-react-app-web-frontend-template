import { ComboBox, ComboBoxItem } from '@opengovsg/oui'
import { useState } from 'react'
import { moreResultsHint, useRemoteOptions, type RemoteOption, type SearchOptions } from './use-remote-options'

export interface RemoteComboBoxProps {
  label: string
  selected: RemoteOption | null
  onChange: (selected: RemoteOption | null) => void
  searchOptions: SearchOptions
  placeholder?: string
}

/** A single-select whose options are searched on the server as the person types. */
export function RemoteComboBox({ label, selected, onChange, searchOptions, placeholder }: RemoteComboBoxProps) {
  const [inputValue, setInputValue] = useState(selected?.name ?? '')
  // The selection can arrive after mount (a name fetched for a restored filter); show it.
  const [shownSelectionId, setShownSelectionId] = useState(selected?.id)
  if (selected?.id !== shownSelectionId) {
    setShownSelectionId(selected?.id)
    setInputValue(selected?.name ?? '')
  }
  const { options, totalItems } = useRemoteOptions(searchOptions, inputValue === selected?.name ? '' : inputValue)

  return (
    <ComboBox<RemoteOption>
      label={label}
      items={options}
      inputValue={inputValue}
      onInputChange={setInputValue}
      selectedKey={selected?.id ?? null}
      onSelectionChange={(key) => {
        const chosen = options.find((option) => option.id === key) ?? null
        if (chosen) {
          onChange(chosen)
          setInputValue(chosen.name)
        }
      }}
      onClear={() => {
        onChange(null)
        setInputValue('')
      }}
      description={moreResultsHint(options.length, totalItems)}
      inputProps={{ placeholder }}
    >
      {(option) => (
        <ComboBoxItem id={option.id} textValue={option.name}>
          {option.name}
        </ComboBoxItem>
      )}
    </ComboBox>
  )
}
