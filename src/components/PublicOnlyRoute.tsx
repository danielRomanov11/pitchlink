import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const PublicOnlyRoute = () => {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return null
    }

    if (isAuthenticated) {
        return <Navigate to="/profile" replace />
    }

    return <Outlet />
}

export default PublicOnlyRoute
