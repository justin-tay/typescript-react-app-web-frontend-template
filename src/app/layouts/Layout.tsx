import { GovtBanner } from '@opengovsg/oui'
import { Link, Outlet } from 'react-router'
import { useCurrentUser } from '@/shared/session/auth-context'
import { APP_NAME, COPYRIGHT_HOLDER, FOOTER_LINKS } from '@/config'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { Footer } from '@/shared/ui/footer'
import { UserMenu } from './UserMenu'

/** The signed-in person's own pages: a header with the account menu, and the footer. */
export function Layout() {
  const user = useCurrentUser()
  return (
    <div className="flex min-h-screen flex-col">
      <GovtBanner />
      <header className="border-b border-base-divider-subtle">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="min-w-0">
            <BrandLogo name={APP_NAME} />
          </Link>
          <UserMenu user={user} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <Outlet />
      </main>
      <Footer appName={APP_NAME} links={FOOTER_LINKS} copyrightHolder={COPYRIGHT_HOLDER} />
    </div>
  )
}
