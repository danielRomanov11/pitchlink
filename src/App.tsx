import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import { AuthProvider } from './context/AuthContext'

// Lazy load pages for performance
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'))
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'))
const ForYouPage = lazy(() => import('./pages/ForYouPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const ListingsPage = lazy(() => import('./pages/ListingsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const TeamProfilePage = lazy(() => import('./pages/TeamProfilePage'))
const TeamsPage = lazy(() => import('./pages/TeamsPage'))

// Simple fallback for Suspense
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--surface-border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
