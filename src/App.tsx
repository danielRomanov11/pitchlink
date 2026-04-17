import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import { AuthProvider } from './context/AuthContext'
import ApplicationsPage from './pages/ApplicationsPage'
import CompleteProfilePage from './pages/CompleteProfilePage'
import ForYouPage from './pages/ForYouPage'
import HomePage from './pages/HomePage'
import ListingsPage from './pages/ListingsPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import SignupPage from './pages/SignupPage'
import TeamProfilePage from './pages/TeamProfilePage'
import TeamsPage from './pages/TeamsPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:teamId" element={<TeamProfilePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/for-you" element={<ForYouPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
