import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const missingConfigMessage =
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'
const invalidKeyMessage =
    'Invalid Supabase key detected. Use the public anon or publishable key in frontend env vars, never the service role key.'

const supabaseConfigErrorMessage = (() => {
    if (!supabaseUrl || !supabaseAnonKey) {
        return missingConfigMessage
    }

    if (supabaseAnonKey.includes('service_role')) {
        return invalidKeyMessage
    }

    return null
})()

const isSupabaseConfigured = supabaseConfigErrorMessage === null

let supabase: SupabaseClient | null = null

if (isSupabaseConfigured && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
        },
    })
}

export { isSupabaseConfigured, supabase, supabaseConfigErrorMessage }
