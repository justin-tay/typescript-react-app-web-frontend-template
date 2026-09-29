import { Button, GovtBanner, Infobox, Spinner } from '@opengovsg/oui'
import { Navigate, useSearchParams } from 'react-router'
import { LOGIN_PATH } from '@/shared/session/api'
import { useAuth } from '@/shared/session/auth-context'
import { loginWithPasskey } from './webauthn-login'
import { APP_NAME } from '@/config'
import { isWebAuthnSupported } from '@/shared/lib/webauthn-codec'
import { useMutation } from '@/shared/lib/use-mutation'

export function Login() {
  const { state, reload } = useAuth()
  const [params] = useSearchParams()
  const passkeyMutation = useMutation(loginWithPasskey)

  if (state.status === 'authenticated') return <Navigate to="/account" replace />

  return (
    <div className="flex min-h-screen flex-col">
      <GovtBanner />
      <main className="flex flex-1 items-center justify-center bg-linear-to-br from-slate-100 via-white to-indigo-100 px-4 py-12">
        <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-1 text-center">
            <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
            <p className="text-base-content-medium">Log in to continue</p>
          </div>
          {params.has('logout') && state.status !== 'error' && (
            <Infobox variant="info">You have been logged out.</Infobox>
          )}
          {state.status === 'error' && (
            <>
              <Infobox variant="error">{state.message}</Infobox>
              <Button variant="outline" onPress={() => void reload()}>
                Try again
              </Button>
            </>
          )}
          {state.status === 'loading' && (
            <div className="flex justify-center">
              <Spinner aria-label="Loading" />
            </div>
          )}
          {state.status === 'anonymous' && (
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onPress={() => window.location.assign(LOGIN_PATH)}>
                Log in with SSO
              </Button>
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
                  Log in with a passkey
                </Button>
              )}
              {passkeyMutation.error && <Infobox variant="error">{passkeyMutation.error.message}</Infobox>}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
