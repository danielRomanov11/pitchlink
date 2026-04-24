import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser } from './auth'

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

export type TeamPreferenceRecord = {
    teamId: string
    preferredPositions: string[]
    preferredPlayerLevels: string[]
    preferredPlayerLocations: string[]
}

export type PlayerPreferenceRecord = {
    userId: string
    preferredLeagues: string[]
    preferredLocations: string[]
}

type UpsertPlayerPreferencePayload = {
    preferredLeagues: string[]
    preferredLocations: string[]
}

type UpsertPlayerPreferenceResult = {
    ok: boolean
    message?: string
}

type TeamPreferenceResult = {
    ok: boolean
    message?: string
    preferencesByTeamId?: Record<string, TeamPreferenceRecord>
}

type PlayerPreferenceResult = {
    ok: boolean
    message?: string
    preference?: PlayerPreferenceRecord
}

type PlayerPreferenceLookupResult = {
    ok: boolean
    message?: string
    preferencesByUserId?: Record<string, PlayerPreferenceRecord>
}

type TeamPreferenceRow = {
    team_id: string
    preferred_positions: string[] | null
    preferred_player_levels: string[] | null
    preferred_player_locations: string[] | null
}

type PlayerPreferenceRow = {
    user_id: string
    preferred_leagues: string[] | null
    preferred_locations: string[] | null
}

const normalizeStringArray = (values: string[] | null | undefined) =>
    (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)

const mapTeamPreferenceRow = (row: TeamPreferenceRow): TeamPreferenceRecord => ({
    teamId: row.team_id,
    preferredPositions: normalizeStringArray(row.preferred_positions),
    preferredPlayerLevels: normalizeStringArray(row.preferred_player_levels),
    preferredPlayerLocations: normalizeStringArray(row.preferred_player_locations),
})

const mapPlayerPreferenceRow = (row: PlayerPreferenceRow): PlayerPreferenceRecord => ({
    userId: row.user_id,
    preferredLeagues: normalizeStringArray(row.preferred_leagues),
    preferredLocations: normalizeStringArray(row.preferred_locations),
})

export const getTeamPreferences = async (teamIds: string[]): Promise<TeamPreferenceResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    if (teamIds.length === 0) {
        return { ok: true, preferencesByTeamId: {} }
    }

    const normalizedTeamIds = teamIds.map((teamId) => teamId.trim()).filter((teamId) => teamId.length > 0)

    if (normalizedTeamIds.length === 0) {
        return { ok: true, preferencesByTeamId: {} }
    }

    const { data, error } = await supabase
        .from('team_preference')
        .select('team_id, preferred_positions, preferred_player_levels, preferred_player_locations')
        .in('team_id', normalizedTeamIds)

    if (error) {
        return { ok: false, message: error.message }
    }

    const preferenceRows = (data ?? []) as TeamPreferenceRow[]

    const preferencesByTeamId = preferenceRows.reduce<Record<string, TeamPreferenceRecord>>((accumulator, row) => {
        const mappedPreference = mapTeamPreferenceRow(row)
        accumulator[mappedPreference.teamId] = mappedPreference
        return accumulator
    }, {})

    return {
        ok: true,
        preferencesByTeamId,
    }
}

type UpsertTeamPreferencePayload = {
    preferredPositions: string[]
    preferredPlayerLevels: string[]
    preferredPlayerLocations: string[]
}

type UpsertTeamPreferenceResult = {
    ok: boolean
    message?: string
}

export const upsertTeamPreference = async (
    teamId: string,
    { preferredPositions, preferredPlayerLevels, preferredPlayerLocations }: UpsertTeamPreferencePayload,
): Promise<UpsertTeamPreferenceResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const normalizedTeamId = teamId.trim()

    if (!normalizedTeamId) {
        return { ok: false, message: 'A team id is required.' }
    }

    const { error } = await supabase.from('team_preference').upsert(
        {
            team_id: normalizedTeamId,
            preferred_positions: normalizeStringArray(preferredPositions),
            preferred_player_levels: normalizeStringArray(preferredPlayerLevels),
            preferred_player_locations: normalizeStringArray(preferredPlayerLocations),
        },
        {
            onConflict: 'team_id',
        },
    )

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}

export const getCurrentPlayerPreference = async (): Promise<PlayerPreferenceResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const { data, error } = await supabase
        .from('player_preference')
        .select('user_id, preferred_leagues, preferred_locations')
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        return { ok: false, message: error.message }
    }

    if (!data) {
        return {
            ok: true,
            preference: {
                userId: user.id,
                preferredLeagues: [],
                preferredLocations: [],
            },
        }
    }

    return {
        ok: true,
        preference: mapPlayerPreferenceRow(data as PlayerPreferenceRow),
    }
}

export const getPlayerPreferencesByUserIds = async (userIds: string[]): Promise<PlayerPreferenceLookupResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const normalizedUserIds = userIds.map((userId) => userId.trim()).filter((userId) => userId.length > 0)

    if (normalizedUserIds.length === 0) {
        return {
            ok: true,
            preferencesByUserId: {},
        }
    }

    const { data, error } = await supabase
        .from('player_preference')
        .select('user_id, preferred_leagues, preferred_locations')
        .in('user_id', normalizedUserIds)

    if (error) {
        return { ok: false, message: error.message }
    }

    const preferencesByUserId = ((data ?? []) as PlayerPreferenceRow[]).reduce<Record<string, PlayerPreferenceRecord>>(
        (accumulator, row) => {
            const mappedPreference = mapPlayerPreferenceRow(row)
            accumulator[mappedPreference.userId] = mappedPreference
            return accumulator
        },
        {},
    )

    return {
        ok: true,
        preferencesByUserId,
    }
}

export const upsertCurrentPlayerPreference = async (
    { preferredLeagues, preferredLocations }: UpsertPlayerPreferencePayload,
): Promise<UpsertPlayerPreferenceResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const normalizedPreferredLeagues = normalizeStringArray(preferredLeagues)
    const normalizedPreferredLocations = normalizeStringArray(preferredLocations)

    const { error } = await supabase.from('player_preference').upsert(
        {
            user_id: user.id,
            preferred_leagues: normalizedPreferredLeagues,
            preferred_locations: normalizedPreferredLocations,
        },
        {
            onConflict: 'user_id',
        },
    )

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}
