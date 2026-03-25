import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

type AuthPayload = {
    email: string
    password: string
}

type AuthResult = {
    ok: boolean
    message?: string
}

const missingConfigMessage =
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

export const signInWithEmail = async ({ email, password }: AuthPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}

export const signUpWithEmail = async ({ email, password }: AuthPayload): Promise<AuthResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/`,
        },
    })

    if (error) {
        return { ok: false, message: error.message }
    }

    return {
        ok: true,
        message: 'Check your email to verify your account before signing in.',
    }
}
