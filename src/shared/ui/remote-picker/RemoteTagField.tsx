import { TagField } from '@opengovsg/oui'
import { useState } from 'react'
import { optionsNote, useRemoteOptions, type RemoteOption, type SearchOptions } from './use-remote-options'

export interface RemoteTagFieldProps {
  label: string
  selected: RemoteOption[]
  onChange: (selected: RemoteOption[]) => void
  searchOptions: SearchOptions
  isDisabled?: boolean
  errorMessage?: string
  isInvalid?: boolean
}

/** A multi-select whose options are searched on the server as the person types. */
export function RemoteTagField({
  label,
  selected,
  onChange,
  searchOptions,
  isDisabled,
  errorMessage,
  isInvalid,
}: RemoteTagFieldProps) {
  const [inputValue, setInputValue] = useState('')
  const { options, totalItems, failed } = useRemoteOptions(searchOptions, inputValue)

  // A selected option stays in the list even when it no longer matches what was typed, so
  // its tag keeps its name.
  const known = new Map<string, RemoteOption>()
  for (const option of [...selected, ...options]) known.set(option.id, option)

  return (
    <TagField<RemoteOption>
      label={label}
      isDisabled={isDisabled}
      errorMessage={errorMessage}
      isInvalid={isInvalid}
      items={[...known.values()]}
      itemToKey={(option) => option.id}
      itemToText={(option) => option.name}
      defaultFilter={() => true}
      selectedKeys={new Set(selected.map((option) => option.id))}
      onSelectionChange={(keys) => onChange([...keys].flatMap((key) => known.get(String(key)) ?? []))}
      inputValue={inputValue}
      onInputChange={setInputValue}
      description={optionsNote(options.length, totalItems, failed)}
    />
  )
}
