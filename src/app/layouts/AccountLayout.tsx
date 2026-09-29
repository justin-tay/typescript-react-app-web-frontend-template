import { Link, Outlet, useLocation } from 'react-router'

const NAV_ITEMS = [
  { href: '/account', label: 'Personal info' },
  { href: '/account/signing-in', label: 'Signing in' },
]

/**
 * A small local nav scoped to the signed-in user's own account pages, separate from the
 * admin "Manage" sidebar: mirrors how Keycloak's own account console separates personal
 * settings from the identity provider's admin console. Sits inside the public `Layout`.
 */
export function AccountLayout() {
  const { pathname } = useLocation()
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Account" className="flex gap-6 border-b border-base-divider-subtle">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={
                isActive
                  ? 'border-b-2 border-base-content-brand pb-3 font-medium text-base-content-brand'
                  : 'pb-3 text-base-content-medium hover:text-base-content-strong'
              }
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </div>
  )
}
