import { apiRequest } from '@/shared/lib/api-request'

/** The settings the account lifecycle and the review follow. `GET` needs settings:read, `PUT` needs settings:update. */
export interface Settings {
  inactivity: {
    enabled: boolean
    suspendAfterDays: number
    removeAfterDays: number
  }
  review: {
    enabled: boolean
    /** 1, 3, 6 or 12: how often accounts holding a privileged permission are reviewed. */
    privilegedIntervalMonths: number
    /** 1, 3, 6 or 12, and not shorter than the privileged interval. */
    nonPrivilegedIntervalMonths: number
  }
}

export function getSettings(): Promise<Settings> {
  return apiRequest('/admin/settings')
}

/** Replaces the whole object. */
export function updateSettings(settings: Settings): Promise<Settings> {
  return apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) })
}
