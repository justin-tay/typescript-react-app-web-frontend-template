import { Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { AccountLayout } from './components/AccountLayout'
import { AdminLayout } from './components/AdminLayout'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { SessionTimeoutModal } from './components/SessionTimeoutModal'
import { AccountProfile } from './pages/AccountProfile'
import { AccountSecurity } from './pages/AccountSecurity'
import { AdminGroups } from './pages/AdminGroups'
import { AdminRoles } from './pages/AdminRoles'
import { AdminUsers } from './pages/AdminUsers'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'

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
