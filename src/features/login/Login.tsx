import { Button, GovtBanner, Infobox, Spinner } from '@opengovsg/oui'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { LOGIN_PATH } from '@/shared/session/api'
import { rememberReturnPath } from '@/shared/session/return-path'
import { useAuth } from '@/shared/session/auth-context'
import { loginWithPasskey } from './webauthn-login'
import { LoginIllustration } from './LoginIllustration'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { APP_NAME, COPYRIGHT_HOLDER, FOOTER_LINKS } from '@/config'
import { isWebAuthnSupported } from '@/shared/lib/webauthn-codec'
import { useMutation } from '@/shared/lib/use-mutation'
import { Footer } from '@/shared/ui/footer'
import { ServiceUnavailable } from '@/shared/ui/service-unavailable'

const SSO_UNAVAILABLE_ERROR = 'identity_provider_unavailable'

/**
 * The sign-in page. `AuthGate` shows it in place of whatever page was asked for, so it must
 * work at any URL and never assumes it is at a login page of its own.
 */
export function Login() {
  const { state, reload } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const passkeyMutation = useMutation(loginWithPasskey)
  // The backend sends a browser here with this error when Keycloak could not be reached. It is
  // kept in state and dropped from the address, so a refresh does not show it a second time.
  const [ssoUnavailable] = useState(() => new URLSearchParams(location.search).get('error') === SSO_UNAVAILABLE_ERROR)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('error') !== SSO_UNAVAILABLE_ERROR) return
    params.delete('error')
    const search = params.toString()
    void navigate({ pathname: location.pathname, search: search && `?${search}` }, { replace: true })
  }, [location.pathname, location.search, navigate])
  const expired = state.status === 'anonymous' && state.expired
  // Signed out because the session ended, or because Keycloak has just ended its own session.
  const wasSignedOut =
    (state.status === 'anonymous' && state.signedOut) ||
    (location.state as { signedOut?: boolean } | null)?.signedOut === true

  // An SSO login leaves for Keycloak and returns to "/", so remember the page being asked for.
  const startSso = () => {
    if (location.pathname !== '/') rememberReturnPath(location.pathname + location.search)
    window.location.assign(LOGIN_PATH)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <GovtBanner />
      <main className="grid flex-1 lg:grid-cols-2">
        <aside className="hidden items-center justify-center bg-slate-50 p-12 lg:flex">
          <LoginIllustration className="w-full max-w-md" />
        </aside>
        <div className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="flex w-full max-w-md flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1>
                <BrandLogo name={APP_NAME} size="lg" />
              </h1>
              {state.status !== 'error' && (
                <p className="text-base-content-medium">Sign in to continue with your organisation account.</p>
              )}
            </div>
            {expired && (
              <Infobox variant="info">You were signed out because your session expired. Please sign in again.</Infobox>
            )}
            {wasSignedOut && !expired && state.status !== 'error' && (
              <Infobox variant="info">You have been signed out.</Infobox>
            )}
            {ssoUnavailable && state.status !== 'error' && (
              <Infobox variant="warning">
                Single sign-on is temporarily unavailable. Try again shortly, or sign in with a passkey.
              </Infobox>
            )}
            {state.status === 'error' && (
              <ServiceUnavailable kind={state.kind} onRetry={() => void reload()} fullWidthButton />
            )}
            {state.status === 'loading' && (
              <div className="flex justify-center">
                <Spinner aria-label="Loading" />
              </div>
            )}
            {state.status === 'anonymous' && (
              <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full" onPress={startSso}>
                  Sign in with SSO
                </Button>
                {isWebAuthnSupported() && (
                  <div className="flex items-center gap-3 text-sm text-base-content-medium" aria-hidden="true">
                    <span className="h-px flex-1 bg-base-divider-medium" />
                    or
                    <span className="h-px flex-1 bg-base-divider-medium" />
                  </div>
                )}
                {isWebAuthnSupported() && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    isDisabled={passkeyMutation.isSubmitting}
                    onPress={async () => {
                      const result = await passkeyMutation.run()
                      if (result.ok) await reload()
                    }}
                  >
                    Sign in with a passkey
                  </Button>
                )}
                {passkeyMutation.error && <Infobox variant="error">{passkeyMutation.error.message}</Infobox>}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer links={FOOTER_LINKS} copyrightHolder={COPYRIGHT_HOLDER} />
    </div>
  )
}
