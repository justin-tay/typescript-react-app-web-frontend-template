import { Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { AdminLayout } from './components/AdminLayout'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { AdminGroups } from './pages/AdminGroups'
import { AdminRoles } from './pages/AdminRoles'
import { AdminUsers } from './pages/AdminUsers'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'

function App() {
  return (
    <AuthProvider>
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
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
