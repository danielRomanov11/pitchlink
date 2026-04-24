import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { UserRole } from '../services/auth'
import { useAuth } from '../context/useAuth'
import { useEffect, useState } from 'react'
import { getCurrentProfile } from '../services/profile'

type ProtectedRouteProps = {
    allowedRoles?: UserRole[]
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const location = useLocation()
    const { isAuthenticated, isLoading } = useAuth()
    const [role, setRole] = useState<UserRole | null>(null)
    const [isLoadingRole, setIsLoadingRole] = useState(Boolean(allowedRoles?.length))

    useEffect(() => {
        let isMounted = true

        const loadRole = async () => {
            if (!allowedRoles?.length || !isAuthenticated) {
                setIsLoadingRole(false)
                return
            }

            setIsLoadingRole(true)

            const profileResult = await getCurrentProfile()

            if (!isMounted) {
                return
            }

            setRole(profileResult.ok && profileResult.profile ? profileResult.profile.role : null)
            setIsLoadingRole(false)
        }

        void loadRole()

        return () => {
            isMounted = false
        }
    }, [allowedRoles, isAuthenticated])

    if (isLoading) {
        return null
    }

    if (isLoadingRole) {
        return null
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    if (allowedRoles?.length && !role) {
        return <Navigate to="/complete-profile" replace state={{ from: location }} />
    }

    if (allowedRoles?.length && !allowedRoles.includes(role!)) {
        return <Navigate to="/applications" replace state={{ from: location }} />
    }

    return <Outlet />
}

export default ProtectedRoute
