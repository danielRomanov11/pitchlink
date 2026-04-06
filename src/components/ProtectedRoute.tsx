import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const ProtectedRoute = () => {
    const location = useLocation()
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return null
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    return <Outlet />
}

export default ProtectedRoute
