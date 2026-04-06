import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

type AuthPayload = {
    email: string
    password: string
}

export type UserRole = 'player' | 'manager'

type SignUpPayload = AuthPayload & {
    fullName: string
    role: UserRole
}

type AuthResult = {
    ok: boolean
    message?: string
    requiresEmailVerification?: boolean
}

type AuthSubscription = {
    unsubscribe: () => void
}

type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

const parseRole = (value: unknown): UserRole => {
    return value === 'manager' ? 'manager' : 'player'
}

const buildNameFromEmail = (email: string) => {
    const localPart = email.split('@')[0] ?? ''
    const segments = localPart
        .split(/[._-]+/)
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)

    if (segments.length === 0) {
        return 'Pitch Link User'
    }

    return segments
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ')
}

const buildEmailRedirectUrl = () => {
    if (typeof window === 'undefined') {
        return undefined
    }

    return new URL('/complete-profile', window.location.origin).toString()
}

const ensureAppUserRow = async (user: User) => {
    if (!supabase) {
        return
    }

    const role = parseRole(user.user_metadata?.role)
    const name =
        typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim().length > 0
            ? user.user_metadata.name.trim()
            : buildNameFromEmail(user.email ?? '')

    await supabase.from('app_user').upsert(
        {
            id: user.id,
            email: user.email ?? '',
            name,
            role,
        },
        {
            onConflict: 'id',
            ignoreDuplicates: true,
        },
    )
}

export const signInWithEmail = async ({ email, password }: AuthPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { ok: false, message: error.message }
    }

    if (data.user) {
        await ensureAppUserRow(data.user)
    }

    return { ok: true }
}

export const signUpWithEmail = async ({ fullName, email, password, role }: SignUpPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: buildEmailRedirectUrl(),
            data: {
                role,
                name: fullName,
            },
        },
    })

    if (error) {
        return { ok: false, message: error.message }
    }

    if (data.user && data.session) {
        await ensureAppUserRow(data.user)
    }

    if (!data.session) {
        return {
            ok: true,
            requiresEmailVerification: true,
            message: 'Check your email to verify your account before signing in.',
        }
    }

    return { ok: true }
}

export const signOut = async (): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}

export const getActiveSession = async (): Promise<Session | null> => {
    if (!isSupabaseConfigured || !supabase) {
        return null
    }

    const { data, error } = await supabase.auth.getSession()

    if (error) {
        return null
    }

    return data.session ?? null
}

export const getCurrentUser = async (): Promise<User | null> => {
    if (!isSupabaseConfigured || !supabase) {
        return null
    }

    const { data, error } = await supabase.auth.getUser()

    if (error) {
        return null
    }

    return data.user ?? null
}

export const subscribeToAuthStateChanges = (callback: AuthStateCallback): AuthSubscription | null => {
    if (!isSupabaseConfigured || !supabase) {
        return null
    }

    const {
        data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session)
    })

    return {
        unsubscribe: () => {
            subscription.unsubscribe()
        },
    }
}
