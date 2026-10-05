import { useEffect } from 'react'

/**
 * Calls `reload` when the person comes back to this window, since another reviewer may have worked on the
 * same task meanwhile. There is no push from the server, and polling would keep the session alive past its
 * idle timeout, so focus is the moment worth refreshing at.
 */
export function useRefetchOnFocus(reload: () => void) {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])
}
