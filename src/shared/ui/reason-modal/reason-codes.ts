/** The reasons the API accepts for suspending or removing an account (`inactive_account` is the job's). */
export const REASON_OPTIONS = [
  { id: 'left_organisation', label: 'Left the organisation' },
  { id: 'no_longer_required', label: 'No longer required' },
  { id: 'policy_violation', label: 'Policy violation' },
  { id: 'other', label: 'Other' },
] as const

export type ReasonCode = (typeof REASON_OPTIONS)[number]['id']

export const NOTE_MAX_LENGTH = 200

/** A reason code as text, with the note after it when there is one. */
export function reasonLabel(code?: string, note?: string): string {
  const label = REASON_OPTIONS.find((option) => option.id === code)?.label ?? code ?? 'Not recorded'
  return note ? `${label}: ${note}` : label
}
