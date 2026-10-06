import { Link } from 'react-router'
import { greeting } from '@/shared/lib/greeting'
import { useCurrentUser } from '@/shared/session/auth-context'
import { isAdmin, userName } from '@/shared/session/user'
import { PageHeader } from '@/shared/ui/page-header'

function LinkCard({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-2 rounded-lg border border-base-divider-medium bg-base-canvas-default p-6 hover:border-interaction-main-default focus-visible:outline-2 focus-visible:outline-utility-focus-default"
    >
      <span className="text-lg font-semibold text-base-content-strong">{title}</span>
      <span className="text-base-content-medium">{description}</span>
    </Link>
  )
}

/** The signed-in person's home: a greeting and where to manage their account. */
export function Home() {
  const user = useCurrentUser()
  return (
    <section className="flex flex-col gap-8">
      <PageHeader title={`${greeting()}, ${userName(user)}`} subtitle="Manage your account and how you sign in." />
      <div className="grid gap-4 sm:grid-cols-2">
        <LinkCard
          to="/account/personal-info"
          title="Personal info"
          description="See the name and email your account is set up with."
        />
        <LinkCard
          to="/account/signing-in"
          title="Sign-in methods"
          description="Configure ways to sign in, such as passkeys."
        />
        {isAdmin(user) && (
          <LinkCard
            to="/admin"
            title="Administration"
            description="Manage users and roles, review accounts, and change settings."
          />
        )}
      </div>
    </section>
  )
}
