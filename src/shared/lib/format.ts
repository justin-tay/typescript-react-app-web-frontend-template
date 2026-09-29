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
