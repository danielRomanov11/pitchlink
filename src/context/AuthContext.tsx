import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createContext, useEffect, useMemo, useState } from 'react'
import { getActiveSession, subscribeToAuthStateChanges } from '../services/auth'

type AuthContextValue = {
    session: Session | null
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
    children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const loadSession = async () => {
            const activeSession = await getActiveSession()

            if (!isMounted) {
                return
            }

            setSession(activeSession)
            setIsLoading(false)
        }

        void loadSession()

        const subscription = subscribeToAuthStateChanges((_event, nextSession) => {
            if (!isMounted) {
                return
            }

            setSession(nextSession)
            setIsLoading(false)
        })

        return () => {
            isMounted = false
            subscription?.unsubscribe()
        }
    }, [])

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            isLoading,
            isAuthenticated: Boolean(session?.user),
        }),
        [isLoading, session],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
