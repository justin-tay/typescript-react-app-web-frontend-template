import { apiRequest } from '@/shared/lib/api-request'

/** The settings the account lifecycle and the review follow. Requires SETTINGS_MANAGE. */
export interface Settings {
  inactivity: {
    enabled: boolean
    suspendAfterDays: number
    removeAfterDays: number
  }
  review: {
    enabled: boolean
    /** 1 to 12. */
    intervalMonths: number
  }
}

export function getSettings(): Promise<Settings> {
  return apiRequest('/admin/settings')
}

/** Replaces the whole object. */
export function updateSettings(settings: Settings): Promise<Settings> {
  return apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
}
