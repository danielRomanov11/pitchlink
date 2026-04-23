import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser, type UserRole } from './auth'

export type ApplicationStatus = 'pending' | 'accepted' | 'declined'

export type ApplicationRecord = {
    id: string
    status: ApplicationStatus
    message: string
    playerName: string
    playerId: string
    teamId: string
    listingId: string
    teamName: string
    listingPosition: string
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
    }
    | Array<{
        name: string
        manager_id?: string
    }>
    | null
    listing:
    | {
        position: string
    }
    | Array<{
        position: string
    }>
    | null
}

type AppUserRow = {
    id: string
    name: string
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

const toApplicationRecord = (row: ApplicationRow): ApplicationRecord => ({
    id: row.id,
    status: row.status,
    message: row.message ?? '',
    playerName: 'Player',
    playerId: row.player_id,
    teamId: row.team_id,
    listingId: row.listing_id,
    teamName: pickTeam(row.team)?.name ?? 'Unknown Team',
    listingPosition: pickListing(row.listing)?.position ?? 'Unknown Position',
    createdAt: row.created_at,
})

const getPlayerNamesByUserIds = async (userIds: string[]) => {
    if (!isSupabaseConfigured || !supabase || userIds.length === 0) {
        return new Map<string, string>()
    }

    const normalizedUserIds = userIds.map((userId) => userId.trim()).filter((userId) => userId.length > 0)

    if (normalizedUserIds.length === 0) {
        return new Map<string, string>()
    }

    const { data, error } = await supabase
        .from('app_user')
        .select('id, name')
        .in('id', normalizedUserIds)

    if (error) {
        return new Map<string, string>()
    }

    return new Map(((data ?? []) as AppUserRow[]).map((row) => [row.id, row.name]))
}

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
            'id, status, message, player_id, team_id, listing_id, created_at, team:team!inner(name, manager_id), listing:listing(position)',
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

    const rows = (data ?? []) as unknown as ApplicationRow[]
    const playerNames = await getPlayerNamesByUserIds(rows.map((row) => row.player_id))

    return {
        ok: true,
        applications: rows.map((row) => ({
            ...toApplicationRecord(row),
            playerName: playerNames.get(row.player_id) ?? 'Player',
        })),
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
