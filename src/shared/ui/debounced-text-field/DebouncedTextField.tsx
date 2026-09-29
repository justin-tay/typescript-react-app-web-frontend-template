import { TextField } from '@opengovsg/oui'
import { useState } from 'react'
import { useDebouncedCommit } from '@/shared/lib/use-debounced-commit'

export interface DebouncedTextFieldProps {
  label: string
  /** The committed value; the field starts with it (for state restored after a refresh). */
  value: string
  onCommit: (value: string) => void
  type?: 'text' | 'email' | 'search'
}

/** A text field that reports its value once typing pauses, for filters that refetch. */
export function DebouncedTextField({ label, value, onCommit, type }: DebouncedTextFieldProps) {
  const [text, setText] = useState(value)
  useDebouncedCommit(text, (typed) => onCommit(typed.trim()))
  return <TextField label={label} type={type} value={text} onChange={setText} />
}
