import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser } from './auth'

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

export type ListingPreferenceRecord = {
    listingId: string
    preferredPositions: string[]
    preferredPlayerLeagues: string[]
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

type ListingPreferenceResult = {
    ok: boolean
    message?: string
    preferencesByListingId?: Record<string, ListingPreferenceRecord>
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

type ListingPreferenceRow = {
    listing_id: string
    preferred_positions: string[] | null
    preferred_player_leagues: string[] | null
    preferred_player_locations: string[] | null
}

type PlayerPreferenceRow = {
    user_id: string
    preferred_leagues: string[] | null
    preferred_locations: string[] | null
}

const normalizeStringArray = (values: string[] | null | undefined) =>
    (values ?? []).map((value) => value.trim()).filter((value) => value.length > 0)

const mapListingPreferenceRow = (row: ListingPreferenceRow): ListingPreferenceRecord => ({
    listingId: row.listing_id,
    preferredPositions: normalizeStringArray(row.preferred_positions),
    preferredPlayerLeagues: normalizeStringArray(row.preferred_player_leagues),
    preferredPlayerLocations: normalizeStringArray(row.preferred_player_locations),
})

const mapPlayerPreferenceRow = (row: PlayerPreferenceRow): PlayerPreferenceRecord => ({
    userId: row.user_id,
    preferredLeagues: normalizeStringArray(row.preferred_leagues),
    preferredLocations: normalizeStringArray(row.preferred_locations),
})

export const getListingPreferences = async (listingIds: string[]): Promise<ListingPreferenceResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    if (listingIds.length === 0) {
        return { ok: true, preferencesByListingId: {} }
    }

    const normalizedListingIds = listingIds.map((listingId) => listingId.trim()).filter((listingId) => listingId.length > 0)

    if (normalizedListingIds.length === 0) {
        return { ok: true, preferencesByListingId: {} }
    }

    const { data, error } = await supabase
        .from('listing_preference')
        .select('listing_id, preferred_positions, preferred_player_leagues, preferred_player_locations')
        .in('listing_id', normalizedListingIds)

    if (error) {
        return { ok: false, message: error.message }
    }

    const preferenceRows = (data ?? []) as ListingPreferenceRow[]

    const preferencesByListingId = preferenceRows.reduce<Record<string, ListingPreferenceRecord>>((accumulator, row) => {
        const mappedPreference = mapListingPreferenceRow(row)
        accumulator[mappedPreference.listingId] = mappedPreference
        return accumulator
    }, {})

    return {
        ok: true,
        preferencesByListingId,
    }
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
