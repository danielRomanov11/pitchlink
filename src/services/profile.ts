import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from '../lib/supabaseClient'
import type { UserRole } from './auth'

type CompleteProfilePayload = {
    role: UserRole
    birthday?: string
    position?: string
    height?: string
    bio?: string
    videoUrl?: string
}

type CompleteProfileResult = {
    ok: boolean
    message?: string
}

type IdentityUpdatePayload = {
    fullName: string
    username: string
}

type IdentityUpdateResult = {
    ok: boolean
    message?: string
}

type ProfileRow = {
    role: string | null
    birthday: string | null
    position: string | null
    height: number | null
    bio: string | null
    url: string | null
}

export type CurrentProfile = {
    userId: string
    email: string
    fullName: string
    username: string
    role: UserRole
    birthday: string
    position: string
    height: string
    bio: string
    videoUrl: string
}

type CurrentProfileResult = {
    ok: boolean
    message?: string
    profile?: CurrentProfile
}

const missingConfigMessage =
    supabaseConfigErrorMessage ??
    'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.'

const normalizeText = (value?: string) => {
    const normalizedValue = value?.trim() ?? ''
    return normalizedValue.length > 0 ? normalizedValue : null
}

const parseRole = (value: unknown): UserRole | null => {
    if (value === 'player' || value === 'manager') {
        return value
    }

    return null
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

const normalizeUsername = (value: string) => value.trim().toLowerCase()

const getUsernameFromMetadata = (value: unknown) => {
    if (typeof value !== 'string') {
        return null
    }

    const normalizedValue = normalizeUsername(value)
    return normalizedValue.length > 0 ? normalizedValue : null
}

const getNameFromMetadata = (value: unknown) => {
    if (typeof value !== 'string') {
        return null
    }

    const normalizedValue = value.trim()
    return normalizedValue.length > 0 ? normalizedValue : null
}

export const getCurrentProfile = async (): Promise<CurrentProfileResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { ok: false, message: 'Sign in to view your profile.' }
    }

    const { data, error } = await supabase
        .from('profile')
        .select('role, birthday, position, height, bio, url')
        .eq('user_id', user.id)
        .maybeSingle<ProfileRow>()

    if (error) {
        return { ok: false, message: error.message }
    }

    const fallbackRole = parseRole(user.user_metadata?.role) ?? 'player'
    const role = parseRole(data?.role) ?? fallbackRole
    const email = user.email ?? ''
    const fullName = getNameFromMetadata(user.user_metadata?.full_name) ?? buildNameFromEmail(email)
    const username = getUsernameFromMetadata(user.user_metadata?.username) ?? normalizeUsername(email.split('@')[0] ?? 'pitchlink')

    return {
        ok: true,
        profile: {
            userId: user.id,
            email,
            fullName,
            username,
            role,
            birthday: data?.birthday ?? '',
            position: data?.position ?? '',
            height: data?.height === null || data?.height === undefined ? '' : String(data.height),
            bio: data?.bio ?? '',
            videoUrl: data?.url ?? '',
        },
    }
}

export const upsertProfile = async ({
    role,
    birthday,
    position,
    height,
    bio,
    videoUrl,
}: CompleteProfilePayload): Promise<CompleteProfileResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        return { ok: false, message: 'Sign in to complete your profile.' }
    }

    const normalizedHeight = normalizeText(height)

    const profileRow: Record<string, string | number | null> = {
        user_id: user.id,
        role,
        birthday: null,
        position: null,
        height: null,
        bio: normalizeText(bio),
        url: normalizeText(videoUrl),
    }

    if (role === 'player') {
        profileRow.birthday = normalizeText(birthday)
        profileRow.position = normalizeText(position)
        profileRow.height = normalizedHeight ? Number(normalizedHeight) : null
    }

    const { error } = await supabase.from('profile').upsert(profileRow, { onConflict: 'user_id' })

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}

export const updateProfileIdentity = async ({ fullName, username }: IdentityUpdatePayload): Promise<IdentityUpdateResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const sanitizedName = fullName.trim()
    const sanitizedUsername = normalizeUsername(username)

    if (sanitizedName.length < 2) {
        return { ok: false, message: 'Enter a valid name.' }
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(sanitizedUsername)) {
        return {
            ok: false,
            message: 'Username must be 3-30 chars and only include lowercase letters, numbers, dots, underscores, or hyphens.',
        }
    }

    const { error } = await supabase.auth.updateUser({
        data: {
            full_name: sanitizedName,
            username: sanitizedUsername,
        },
    })

    if (error) {
        return { ok: false, message: 'Unable to update profile identity right now. Please try again.' }
    }

    return { ok: true }
}
