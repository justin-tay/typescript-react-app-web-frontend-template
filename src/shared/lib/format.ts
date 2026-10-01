const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** An ISO instant as a local date and time, for example `21 Sept 2025, 09:12`. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** An ISO date (`2026-12-31`) as `31 Dec 2026`. Read as UTC so the day never shifts with the time zone. */
export function formatDate(isoDate: string): string {
  return date.format(new Date(`${isoDate}T00:00:00Z`))
}
