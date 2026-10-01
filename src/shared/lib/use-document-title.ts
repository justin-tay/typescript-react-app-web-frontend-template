import { useEffect } from 'react'
import { APP_NAME } from '@/config'

/**
 * Sets the browser tab title for as long as the calling page is shown, as "Page - App name", and puts
 * the plain app name back when it goes. Without it every page has the same title, so history, tab
 * lists and screen readers cannot tell them apart.
 */
export function useDocumentTitle(page: string | undefined) {
  useEffect(() => {
    document.title = page ? `${page} - ${APP_NAME}` : APP_NAME
    return () => {
      document.title = APP_NAME
    }
  }, [page])
}
