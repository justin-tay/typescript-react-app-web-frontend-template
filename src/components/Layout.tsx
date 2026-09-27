import { Button, GovtBanner, Spinner } from '@opengovsg/oui'
import { Link, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/auth-context'
import { APP_NAME } from '../config'
import { UserMenu } from './UserMenu'

function HeaderActions() {
  const { state } = useAuth()
  const navigate = useNavigate()
  if (state.status === 'loading') return <Spinner aria-label="Loading" />
  if (state.status === 'authenticated') return <UserMenu user={state.user} />
  if (state.status === 'anonymous') {
    return <Button onPress={() => void navigate('/login')}>Log in</Button>
  }
  return null
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <GovtBanner />
      <header className="border-b border-base-divider-subtle">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold">
            {APP_NAME}
          </Link>
          <HeaderActions />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <Outlet />
      </main>
      <footer className="border-t border-base-divider-subtle">
        <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-base-content-medium">
          © {new Date().getFullYear()} {APP_NAME}
        </div>
      </footer>
    </div>
  )
}
