/**
 * Backend enum-like values (`pending_verification`, `suspend_user`, `account_review`) as
 * readable text; camel case keys (`rolesAdded`) too. Generic on purpose: a value added later still reads acceptably without a
 * change here, and nothing mirrors the backend's list of values.
 */
export function humanize(value: string): string {
  const words = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
