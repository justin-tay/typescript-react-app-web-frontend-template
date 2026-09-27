import { Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
