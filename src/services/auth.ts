import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from '../lib/supabaseClient'

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

const missingConfigMessage =
    supabaseConfigErrorMessage ??
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

const signInErrorMessage = 'Sign in failed. Check your email and password and try again.'
const signUpErrorMessage = 'Sign up failed. Please try again.'

const buildEmailRedirectUrl = () => new URL('/complete-profile', window.location.origin).toString()

type AuthErrorLike = {
    message: string
    status?: number
    code?: string
}

const mapAuthErrorMessage = (error: AuthErrorLike, fallbackMessage: string): string => {
    const normalizedMessage = error.message.toLowerCase()
    const normalizedCode = error.code?.toLowerCase()

    if (error.status === 429 || normalizedMessage.includes('rate limit') || normalizedCode?.includes('rate')) {
        return 'Too many attempts right now. Please wait a minute and try again.'
    }

    if (normalizedMessage.includes('already registered')) {
        return 'This email is already registered. Try signing in instead.'
    }

    if (normalizedMessage.includes('email not confirmed')) {
        return 'Check your email and confirm your account before signing in.'
    }

    return fallbackMessage
}

export const signInWithEmail = async ({ email, password }: AuthPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { ok: false, message: mapAuthErrorMessage(error, signInErrorMessage) }
    }

    return { ok: true }
}

export const signUpWithEmail = async ({ email, password, fullName, role }: SignUpPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: buildEmailRedirectUrl(),
            data: {
                full_name: fullName.trim(),
                role,
            },
        },
    })

    if (error) {
        return { ok: false, message: mapAuthErrorMessage(error, signUpErrorMessage) }
    }

    const requiresEmailVerification = !data.session

    return {
        ok: true,
        requiresEmailVerification,
        message: requiresEmailVerification
            ? 'Check your email to verify your account. After verification, sign in and complete your profile.'
            : 'Account created successfully.',
    }
}

export const signOut = async (): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
        return { ok: false, message: 'Unable to sign out right now. Please try again.' }
    }

    return { ok: true }
}

export const getActiveSession = async (): Promise<Session | null> => {
    if (!isSupabaseConfigured || !supabase) {
        return null
    }

    const {
        data: { session },
        error,
    } = await supabase.auth.getSession()

    if (error) {
        return null
    }

    return session
}

export const getCurrentUser = async (): Promise<User | null> => {
    if (!isSupabaseConfigured || !supabase) {
        return null
    }

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) {
        return null
    }

    return user
}

export const subscribeToAuthStateChanges = (
    listener: (event: AuthChangeEvent, session: Session | null) => void,
): AuthSubscription | null => {
    if (!isSupabaseConfigured || !supabase) {
        return null
    }

    const { data } = supabase.auth.onAuthStateChange(listener)
    return data.subscription
}
