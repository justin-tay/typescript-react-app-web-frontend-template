import { Route, Routes } from 'react-router'
import { AuthProvider } from '@/shared/session/AuthProvider'
import { AccountLayout } from '@/app/layouts/AccountLayout'
import { AdminLayout } from '@/app/layouts/AdminLayout'
import { Layout } from '@/app/layouts/Layout'
import { RequireAuth } from './RequireAuth'
import { SessionTimeoutModal } from './SessionTimeoutModal'
import { AccountProfile } from '@/features/account/AccountProfile'
import { AccountSecurity } from '@/features/account/AccountSecurity'
import { AdminGroups } from '@/features/admin/AdminGroups'
import { AdminRoles } from '@/features/admin/AdminRoles'
import { AdminUsers } from '@/features/admin/AdminUsers'
import { Landing } from '@/features/landing/Landing'
import { Login } from '@/features/login/Login'

function App() {
  return (
    <AuthProvider>
      <SessionTimeoutModal />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/groups" element={<AdminGroups />} />
          <Route path="/roles" element={<AdminRoles />} />
        </Route>
        <Route element={<Layout />}>
          <Route
            element={
              <RequireAuth>
                <AccountLayout />
              </RequireAuth>
            }
          >
            <Route path="/account" element={<AccountProfile />} />
            <Route path="/account/security" element={<AccountSecurity />} />
          </Route>
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
