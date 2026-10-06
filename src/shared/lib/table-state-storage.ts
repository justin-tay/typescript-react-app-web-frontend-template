import type { SortingState } from '@tanstack/react-table'

export interface TableState {
  pageIndex: number
  pageSize: number
  sorting: SortingState
  search: string
  filters: Record<string, string>
}

export const DEFAULT_PAGE_SIZE = 20
const STORAGE_PREFIX = 'table-state:'

function isTableState(value: unknown): value is TableState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    Number.isInteger(v.pageIndex) &&
    (v.pageIndex as number) >= 0 &&
    Number.isInteger(v.pageSize) &&
    (v.pageSize as number) > 0 &&
    typeof v.search === 'string' &&
    Array.isArray(v.sorting) &&
    v.sorting.every((s) => typeof s?.id === 'string' && typeof s?.desc === 'boolean') &&
    typeof v.filters === 'object' &&
    v.filters !== null &&
    Object.values(v.filters).every((f) => typeof f === 'string')
  )
}

export function loadTableState(storageKey: string | undefined, pageSize: number): TableState {
  const fallback: TableState = { pageIndex: 0, pageSize, sorting: [], search: '', filters: {} }
  if (!storageKey) return fallback
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_PREFIX + storageKey) ?? 'null')
    return isTableState(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

export function saveTableState(storageKey: string | undefined, state: TableState) {
  if (!storageKey) return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(state))
  } catch {
    // Storage unavailable or full: the table still works, it just won't survive a refresh.
  }
}

/** Forgets every table's saved state; call when the person signs out or the session ends. */
export function clearPersistedTableState() {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) sessionStorage.removeItem(key)
    }
  } catch {
    // Nothing was saved if storage is unavailable.
  }
}

/**
 * Sets a list's saved state so that opening it shows `filters` from the first page, keeping
 * its sort and page size, for a link from somewhere else (a dashboard card) that means
 * "the pending users". Views keep their state in sessionStorage, not the URL, so a link
 * cannot carry filters itself.
 */
export function presetTableState(storageKey: string, filters: Record<string, string>) {
  const current = loadTableState(storageKey, DEFAULT_PAGE_SIZE)
  saveTableState(storageKey, { ...current, pageIndex: 0, search: '', filters })
}
