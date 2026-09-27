import { Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Profile } from './pages/Profile'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          {/* Also serves /login?logout, where Keycloak returns the browser after logout. */}
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
