import { Navigate, Route, Routes, useSearchParams } from 'react-router'
import { AuthProvider } from '@/shared/session/AuthProvider'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { Layout } from '@/app/layouts/Layout'
import { AuthGate } from './AuthGate'
import { NotFound } from './NotFound'
import { RequireAdmin } from './RequireAdmin'
import { ReauthModal } from './ReauthModal'
import { SessionTimeoutModal } from './SessionTimeoutModal'
import { AccountProfile } from '@/features/account/AccountProfile'
import { AccountSigningIn } from '@/features/account/AccountSigningIn'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { AdminPermissions } from '@/features/admin/AdminPermissions'
import { AdminRoleDetail } from '@/features/admin/AdminRoleDetail'
import { AdminRoles } from '@/features/admin/AdminRoles'
import { AdminUserDetail } from '@/features/admin/AdminUserDetail'
import { AdminUsers } from '@/features/admin/AdminUsers'
import { AuditTrail } from '@/features/audit/AuditTrail'
import { Home } from '@/features/home/Home'
import { ReviewAttention } from '@/features/review/ReviewAttention'
import { reviewRoutes } from '@/features/review/routes'
import { SettingsPage } from '@/features/settings/SettingsPage'

/**
 * Keycloak sends the browser to `/login?logout` after it ends its own session (that address
 * is registered with it, see the backend's configure-keycloak script). There is no login
 * page any more, so send the visitor to "/", where the sign-in card appears, and say why.
 */
function LoggedOutReturn() {
  const [params] = useSearchParams()
  return <Navigate to="/" replace state={params.has('logout') ? { signedOut: true } : undefined} />
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard attention={<ReviewAttention />} />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="roles/:id" element={<AdminRoleDetail />} />
        <Route path="permissions" element={<AdminPermissions />} />
        {reviewRoutes()}
        <Route path="audit" element={<AuditTrail />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="account/personal-info" element={<AccountProfile />} />
        <Route path="account/signing-in" element={<AccountSigningIn />} />
      </Route>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="account/personal-info" element={<AccountProfile />} />
        <Route path="account/signing-in" element={<AccountSigningIn />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <SessionTimeoutModal />
      <ReauthModal />
      <Routes>
        <Route path="/login" element={<LoggedOutReturn />} />
        <Route
          path="*"
          element={
            <AuthGate>
              <AppRoutes />
            </AuthGate>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
