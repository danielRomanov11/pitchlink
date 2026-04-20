import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser, type UserRole } from './auth'

export type ApplicationStatus = 'pending' | 'accepted' | 'declined'

export type ApplicationRecord = {
    id: string
    status: ApplicationStatus
    message: string
    playerId: string
    teamId: string
    listingId: string
    teamName: string
    teamLeague: string
    teamLocation: string
    listingPosition: string
    listingPreferredPositions: string[]
    listingPreferredPlayerLeagues: string[]
    listingPreferredPlayerLocations: string[]
    playerPosition: string
    playerPreferredLeagues: string[]
    playerPreferredLocations: string[]
    createdAt: string
}

type ApplicationListResult = {
    ok: boolean
    message?: string
    applications?: ApplicationRecord[]
}

type CreateApplicationPayload = {
    teamId: string
    listingId: string
    message?: string
}

type ApplicationMutationResult = {
    ok: boolean
    message?: string
}

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

type ApplicationRow = {
    id: string
    status: ApplicationStatus
    message: string | null
    player_id: string
    team_id: string
    listing_id: string
    created_at: string
    team:
    | {
        name: string
        manager_id?: string
        league?: string
        location?: string
    }
    | Array<{
        name: string
        manager_id?: string
        league?: string
        location?: string
    }>
    | null
    listing:
    | {
        position: string
        listing_preference:
        | {
            preferred_positions: string[] | null
            preferred_player_leagues: string[] | null
            preferred_player_locations: string[] | null
        }
        | Array<{
            preferred_positions: string[] | null
            preferred_player_leagues: string[] | null
            preferred_player_locations: string[] | null
        }>
        | null
    }
    | Array<{
        position: string
        listing_preference:
        | {
            preferred_positions: string[] | null
            preferred_player_leagues: string[] | null
            preferred_player_locations: string[] | null
        }
        | Array<{
            preferred_positions: string[] | null
            preferred_player_leagues: string[] | null
            preferred_player_locations: string[] | null
        }>
        | null
    }>
    | null
    player:
    | {
        position: string | null
        player_preference:
        | {
            preferred_leagues: string[] | null
            preferred_locations: string[] | null
        }
        | Array<{
            preferred_leagues: string[] | null
            preferred_locations: string[] | null
        }>
        | null
    }
    | Array<{
        position: string | null
        player_preference:
        | {
            preferred_leagues: string[] | null
            preferred_locations: string[] | null
        }
        | Array<{
            preferred_leagues: string[] | null
            preferred_locations: string[] | null
        }>
        | null
    }>
    | null
}

const parsePreferenceValues = (value: unknown) => {
    if (!Array.isArray(value)) {
        return [] as string[]
    }

    const deduped = new Set<string>()

    for (const entry of value) {
        if (typeof entry !== 'string') {
            continue
        }

        const normalized = entry.trim()

        if (!normalized) {
            continue
        }

        deduped.add(normalized)
    }

    return [...deduped]
}

const pickTeam = (team: ApplicationRow['team']) => {
    if (Array.isArray(team)) {
        return team[0] ?? null
    }

    return team
}

const pickListing = (listing: ApplicationRow['listing']) => {
    if (Array.isArray(listing)) {
        return listing[0] ?? null
    }

    return listing
}

const pickPlayer = (player: ApplicationRow['player']) => {
    if (Array.isArray(player)) {
        return player[0] ?? null
    }

    return player
}

const pickListingPreference = (
    listingPreference:
        | {
            preferred_positions: string[] | null
            preferred_player_leagues: string[] | null
            preferred_player_locations: string[] | null
        }
        | Array<{
            preferred_positions: string[] | null
            preferred_player_leagues: string[] | null
            preferred_player_locations: string[] | null
        }>
        | null
        | undefined,
) => {
    if (Array.isArray(listingPreference)) {
        return listingPreference[0] ?? null
    }

    return listingPreference ?? null
}

const pickPlayerPreference = (
    playerPreference:
        | {
            preferred_leagues: string[] | null
            preferred_locations: string[] | null
        }
        | Array<{
            preferred_leagues: string[] | null
            preferred_locations: string[] | null
        }>
        | null
        | undefined,
) => {
    if (Array.isArray(playerPreference)) {
        return playerPreference[0] ?? null
    }

    return playerPreference ?? null
}

const toApplicationRecord = (row: ApplicationRow): ApplicationRecord => ({
    id: row.id,
    status: row.status,
    message: row.message ?? '',
    playerId: row.player_id,
    teamId: row.team_id,
    listingId: row.listing_id,
    teamName: pickTeam(row.team)?.name ?? 'Unknown Team',
    teamLeague: pickTeam(row.team)?.league ?? '',
    teamLocation: pickTeam(row.team)?.location ?? '',
    listingPosition: pickListing(row.listing)?.position ?? 'Unknown Position',
    listingPreferredPositions: parsePreferenceValues(
        pickListingPreference(pickListing(row.listing)?.listing_preference)?.preferred_positions,
    ),
    listingPreferredPlayerLeagues: parsePreferenceValues(
        pickListingPreference(pickListing(row.listing)?.listing_preference)?.preferred_player_leagues,
    ),
    listingPreferredPlayerLocations: parsePreferenceValues(
        pickListingPreference(pickListing(row.listing)?.listing_preference)?.preferred_player_locations,
    ),
    playerPosition: pickPlayer(row.player)?.position ?? '',
    playerPreferredLeagues: parsePreferenceValues(
        pickPlayerPreference(pickPlayer(row.player)?.player_preference)?.preferred_leagues,
    ),
    playerPreferredLocations: parsePreferenceValues(
        pickPlayerPreference(pickPlayer(row.player)?.player_preference)?.preferred_locations,
    ),
    createdAt: row.created_at,
})

export const getApplicationsForCurrentUser = async (role: UserRole): Promise<ApplicationListResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    let query = supabase
        .from('application')
        .select(
            'id, status, message, player_id, team_id, listing_id, created_at, team:team!inner(name, manager_id, league, location), listing:listing(position, listing_preference(preferred_positions, preferred_player_leagues, preferred_player_locations)), player:player(position, player_preference(preferred_leagues, preferred_locations))',
        )
        .order('created_at', { ascending: false })

    if (role === 'player') {
        query = query.eq('player_id', user.id)
    } else {
        query = query.eq('team.manager_id', user.id)
    }

    const { data, error } = await query

    if (error) {
        return { ok: false, message: error.message }
    }

    return {
        ok: true,
        applications: ((data ?? []) as unknown as ApplicationRow[]).map(toApplicationRecord),
    }
}

export const createApplication = async ({ teamId, listingId, message }: CreateApplicationPayload): Promise<ApplicationMutationResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const { error } = await supabase.from('application').insert({
        player_id: user.id,
        team_id: teamId,
        listing_id: listingId,
        message: message?.trim() || null,
    })

    if (error) {
        if (error.code === '23505') {
            return { ok: false, message: 'You have already applied to this listing.' }
        }

        return { ok: false, message: error.message }
    }

    return { ok: true }
}

export const updateApplicationStatus = async (
    applicationId: string,
    status: ApplicationStatus,
    message?: string,
): Promise<ApplicationMutationResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    if (!applicationId) {
        return { ok: false, message: 'Application id is required.' }
    }

    const { data: existingApplication, error: existingApplicationError } = await supabase
        .from('application')
        .select('message')
        .eq('id', applicationId)
        .single()

    if (existingApplicationError) {
        return { ok: false, message: existingApplicationError.message }
    }

    const updatePayload: { status: ApplicationStatus; message: string | null } = {
        status,
        message: ((existingApplication as { message: string | null } | null)?.message ?? null),
    }

    if (message !== undefined) {
        updatePayload.message = message.trim() || null
    }

    const { error } = await supabase
        .from('application')
        .update(updatePayload)
        .eq('id', applicationId)

    if (error) {
        return { ok: false, message: error.message }
    }

    return { ok: true }
}
