/** The form's values as typed: numbers stay text until they are checked. */
export interface SettingsDraft {
  inactivityEnabled: boolean
  suspendAfterDays: string
  removeAfterDays: string
  reviewEnabled: boolean
  privilegedIntervalMonths: string
  nonPrivilegedIntervalMonths: string
}

export type SettingsErrors = Partial<
  Record<'suspendAfterDays' | 'removeAfterDays' | 'privilegedIntervalMonths' | 'nonPrivilegedIntervalMonths', string>
>

export const REVIEW_INTERVALS = [1, 3, 6, 12] as const

const isWholeNumber = (value: string) => /^\d+$/.test(value.trim())

/**
 * The server's rules, checked first so a mistake is shown beside its field: both day counts
 * positive, removal later than suspension, and review periods of 1, 3, 6 or 12 months with the non-privileged one no shorter than the privileged one. The server
 * still decides; this only saves a round trip.
 */
export function validateSettings(draft: SettingsDraft): SettingsErrors {
  const errors: SettingsErrors = {}
  const suspend = Number(draft.suspendAfterDays)
  const remove = Number(draft.removeAfterDays)
  const privileged = Number(draft.privilegedIntervalMonths)
  const nonPrivileged = Number(draft.nonPrivilegedIntervalMonths)
  const isInterval = (value: string, months: number) =>
    isWholeNumber(value) && (REVIEW_INTERVALS as readonly number[]).includes(months)

  if (!isWholeNumber(draft.suspendAfterDays) || suspend < 1 || suspend > 36500) {
    errors.suspendAfterDays = 'Enter a whole number of days from 1 to 36500.'
  }
  if (!isWholeNumber(draft.removeAfterDays) || remove < 1 || remove > 36500) {
    errors.removeAfterDays = 'Enter a whole number of days from 1 to 36500.'
  } else if (!errors.suspendAfterDays && remove <= suspend) {
    errors.removeAfterDays = 'Removal must come after suspension: enter more days than the suspension period.'
  }
  const intervalMessage = 'Choose 1, 3, 6 or 12 months.'
  if (!isInterval(draft.privilegedIntervalMonths, privileged)) errors.privilegedIntervalMonths = intervalMessage
  if (!isInterval(draft.nonPrivilegedIntervalMonths, nonPrivileged)) {
    errors.nonPrivilegedIntervalMonths = intervalMessage
  } else if (!errors.privilegedIntervalMonths && nonPrivileged < privileged) {
    errors.nonPrivilegedIntervalMonths = 'This cannot be shorter than the privileged period.'
  }
  return errors
}
