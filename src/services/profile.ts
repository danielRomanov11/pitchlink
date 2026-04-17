import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
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
}

type IdentityUpdateResult = {
    ok: boolean
    message?: string
}

type PlayerProfileRow = {
    birthday: string | null
    position: string | null
    height: number | null
    bio: string | null
    url: string | null
}

type ManagerProfileRow = {
    bio: string | null
}

export type CurrentProfile = {
    userId: string
    email: string
    fullName: string
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

const getNameFromMetadata = (value: unknown) => {
    if (typeof value !== 'string') {
        return null
    }

    const normalizedValue = value.trim()
    return normalizedValue.length > 0 ? normalizedValue : null
}

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

const toCurrentProfile = (
    user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
    appUser: { email: string; name: string; role: UserRole },
    player: PlayerProfileRow | null,
    manager: ManagerProfileRow | null,
): CurrentProfile => ({
    userId: user.id,
    email: appUser.email || user.email || '',
    fullName: appUser.name,
    role: appUser.role,
    birthday: player?.birthday ?? '',
    position: player?.position ?? '',
    height: player?.height === null || player?.height === undefined ? '' : String(player.height),
    bio: appUser.role === 'player' ? player?.bio ?? '' : manager?.bio ?? '',
    videoUrl: player?.url ?? '',
})

const parseHeight = (height?: string) => {
    if (!height || height.trim().length === 0) {
        return null
    }

    const parsedHeight = Number(height)

    if (!Number.isFinite(parsedHeight)) {
        return null
    }

    return Math.round(parsedHeight)
}

const getCurrentAuthUser = async () => {
    if (!supabase) {
        return { user: null as null | { id: string; email?: string | null; user_metadata?: Record<string, unknown> } }
    }

    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
        return { user: null }
    }

    return { user: data.user }
}

export const getCurrentProfile = async (): Promise<CurrentProfileResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { user } = await getCurrentAuthUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const metadataRole = parseRole(user.user_metadata?.role)
    const metadataName = getNameFromMetadata(user.user_metadata?.name)

    const { data: appUserRow, error: appUserError } = await supabase
        .from('app_user')
        .select('email, name, role')
        .eq('id', user.id)
        .maybeSingle()

    if (appUserError) {
        return { ok: false, message: appUserError.message }
    }

    const resolvedRole = parseRole(appUserRow?.role) ?? metadataRole ?? 'player'
    const resolvedName =
        typeof appUserRow?.name === 'string' && appUserRow.name.trim().length > 0
            ? appUserRow.name
            : metadataName ?? buildNameFromEmail(user.email ?? '')
    const resolvedEmail = typeof appUserRow?.email === 'string' ? appUserRow.email : user.email ?? ''

    if (!appUserRow) {
        const { error: insertAppUserError } = await supabase.from('app_user').insert({
            id: user.id,
            email: resolvedEmail,
            name: resolvedName,
            role: resolvedRole,
        })

        if (insertAppUserError) {
            return { ok: false, message: insertAppUserError.message }
        }
    }

    let playerRow: PlayerProfileRow | null = null
    let managerRow: ManagerProfileRow | null = null

    if (resolvedRole === 'player') {
        const { data, error } = await supabase
            .from('player')
            .select('birthday, position, height, bio, url')
            .eq('user_id', user.id)
            .maybeSingle()

        if (error) {
            return { ok: false, message: error.message }
        }

        playerRow = (data as PlayerProfileRow | null) ?? null
    } else {
        const { data, error } = await supabase
            .from('manager')
            .select('bio')
            .eq('user_id', user.id)
            .maybeSingle()

        if (error) {
            return { ok: false, message: error.message }
        }

        managerRow = (data as ManagerProfileRow | null) ?? null
    }

    return {
        ok: true,
        profile: toCurrentProfile(
            user,
            {
                email: resolvedEmail,
                name: resolvedName,
                role: resolvedRole,
            },
            playerRow,
            managerRow,
        ),
    }
}

export const upsertProfile = async ({ role, birthday, position, height, bio, videoUrl }: CompleteProfilePayload): Promise<CompleteProfileResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { user } = await getCurrentAuthUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const parsedRole = parseRole(role)

    if (!parsedRole) {
        return { ok: false, message: 'Invalid role.' }
    }

    const nameFromMetadata = getNameFromMetadata(user.user_metadata?.name) ?? buildNameFromEmail(user.email ?? '')

    const { error: upsertAppUserError } = await supabase.from('app_user').upsert(
        {
            id: user.id,
            email: user.email ?? '',
            name: nameFromMetadata,
            role: parsedRole,
        },
        {
            onConflict: 'id',
        },
    )

    if (upsertAppUserError) {
        return { ok: false, message: upsertAppUserError.message }
    }

    if (parsedRole === 'manager') {
        const { error: upsertManagerError } = await supabase.from('manager').upsert(
            {
                user_id: user.id,
                bio: normalizeText(bio),
            },
            {
                onConflict: 'user_id',
            },
        )

        if (upsertManagerError) {
            return { ok: false, message: upsertManagerError.message }
        }

        return { ok: true }
    }

    const parsedHeight = parseHeight(height)

    const { error: upsertPlayerError } = await supabase.from('player').upsert(
        {
            user_id: user.id,
            birthday: normalizeText(birthday),
            position: normalizeText(position),
            height: parsedHeight,
            bio: normalizeText(bio),
            url: normalizeText(videoUrl),
        },
        {
            onConflict: 'user_id',
        },
    )

    if (upsertPlayerError) {
        return { ok: false, message: upsertPlayerError.message }
    }

    return { ok: true }
}

export const updateProfileIdentity = async ({ fullName }: IdentityUpdatePayload): Promise<IdentityUpdateResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const { user } = await getCurrentAuthUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const normalizedName = fullName.trim()

    if (normalizedName.length < 2) {
        return { ok: false, message: 'Enter your full name.' }
    }

    const { error: appUserUpdateError } = await supabase
        .from('app_user')
        .update({
            name: normalizedName,
            email: user.email ?? '',
        })
        .eq('id', user.id)

    if (appUserUpdateError) {
        return { ok: false, message: appUserUpdateError.message }
    }

    const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
            name: normalizedName,
        },
    })

    if (authUpdateError) {
        return { ok: false, message: authUpdateError.message }
    }

    return { ok: true }
}
