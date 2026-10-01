/** The form's values as typed: numbers stay text until they are checked. */
export interface SettingsDraft {
  inactivityEnabled: boolean
  suspendAfterDays: string
  removeAfterDays: string
  reviewEnabled: boolean
  intervalMonths: string
}

export type SettingsErrors = Partial<Record<'suspendAfterDays' | 'removeAfterDays' | 'intervalMonths', string>>

const isWholeNumber = (value: string) => /^\d+$/.test(value.trim())

/**
 * The server's rules, checked first so a mistake is shown beside its field: both day counts
 * positive, removal later than suspension, and a review period of 1 to 12 months. The server
 * still decides; this only saves a round trip.
 */
export function validateSettings(draft: SettingsDraft): SettingsErrors {
  const errors: SettingsErrors = {}
  const suspend = Number(draft.suspendAfterDays)
  const remove = Number(draft.removeAfterDays)
  const interval = Number(draft.intervalMonths)

  if (!isWholeNumber(draft.suspendAfterDays) || suspend < 1 || suspend > 36500) {
    errors.suspendAfterDays = 'Enter a whole number of days from 1 to 36500.'
  }
  if (!isWholeNumber(draft.removeAfterDays) || remove < 1 || remove > 36500) {
    errors.removeAfterDays = 'Enter a whole number of days from 1 to 36500.'
  } else if (!errors.suspendAfterDays && remove <= suspend) {
    errors.removeAfterDays = 'Removal must come after suspension: enter more days than the suspension period.'
  }
  if (!isWholeNumber(draft.intervalMonths) || interval < 1 || interval > 12) {
    errors.intervalMonths = 'Enter a whole number of months from 1 to 12.'
  }
  return errors
}
