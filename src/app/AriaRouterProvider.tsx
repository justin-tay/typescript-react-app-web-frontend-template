import { RouterProvider } from 'react-aria-components'
import type { ReactNode } from 'react'
import { useHref, useNavigate } from 'react-router'

/**
 * Bridges React Aria Components (which OUI is built on, e.g. `Link` and `Sidebar`) to
 * React Router, so following one of their links navigates client-side instead of
 * reloading the page. Must sit inside the `BrowserRouter`. See OUI's Vite setup guide.
 */
export function AriaRouterProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      {children}
    </RouterProvider>
  )
}
