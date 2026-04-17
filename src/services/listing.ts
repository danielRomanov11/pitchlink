import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser, type UserRole } from './auth'

export type ListingRecord = {
    id: string
    status: 'open' | 'closed'
    description: string
    position: string
    teamId: string
    teamName: string
    teamLeague: string
    teamLocation: string
    applicants: number
}

type ListingResult = {
    ok: boolean
    message?: string
    listings?: ListingRecord[]
}

type CreateListingPayload = {
    teamId: string
    status?: 'open' | 'closed'
    description: string
    position: string
}

type CreateListingResult = {
    ok: boolean
    message?: string
    listing?: ListingRecord
}

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

type ListingRow = {
    id: string
    status: 'open' | 'closed'
    description: string
    position: string
    team_id: string
    team:
    | {
        id: string
        name: string
        league: string
        location: string
        manager_id: string
    }
    | Array<{
        id: string
        name: string
        league: string
        location: string
        manager_id: string
    }>
    | null
}

const pickTeam = (team: ListingRow['team']) => {
    if (Array.isArray(team)) {
        return team[0] ?? null
    }

    return team
}

const toListingRecord = (row: ListingRow, applicants: number): ListingRecord => ({
    id: row.id,
    status: row.status,
    description: row.description,
    position: row.position,
    teamId: row.team_id,
    teamName: pickTeam(row.team)?.name ?? 'Unknown Team',
    teamLeague: pickTeam(row.team)?.league ?? '',
    teamLocation: pickTeam(row.team)?.location ?? '',
    applicants,
})

const getApplicantCounts = async (listingIds: string[]) => {
    if (!supabase || listingIds.length === 0) {
        return new Map<string, number>()
    }

    const { data } = await supabase.from('application').select('listing_id').in('listing_id', listingIds)

    const counts = new Map<string, number>()

    for (const row of data ?? []) {
        const listingId = (row as { listing_id: string }).listing_id
        counts.set(listingId, (counts.get(listingId) ?? 0) + 1)
    }

    return counts
}

export const getListingsForCurrentUser = async (role: UserRole): Promise<ListingResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    let query = supabase
        .from('listing')
        .select('id, status, description, position, team_id, team:team!inner(id, name, league, location, manager_id)')
        .order('created_at', { ascending: false })

    if (role === 'manager') {
        query = query.eq('team.manager_id', user.id)
    } else {
        query = query.eq('status', 'open')
    }

    const { data, error } = await query

    if (error) {
        return { ok: false, message: error.message }
    }

    const rows = (data ?? []) as unknown as ListingRow[]
    const listingIds = rows.map((listing) => listing.id)
    const applicantCounts = await getApplicantCounts(listingIds)

    return {
        ok: true,
        listings: rows.map((row) => toListingRecord(row, applicantCounts.get(row.id) ?? 0)),
    }
}

export const createListing = async ({ teamId, status = 'open', description, position }: CreateListingPayload): Promise<CreateListingResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const normalizedPosition = position.trim()
    const normalizedDescription = description.trim()

    if (!teamId || !normalizedPosition) {
        return { ok: false, message: 'Team and position are required.' }
    }

    const { data, error } = await supabase
        .from('listing')
        .insert({
            status,
            description: normalizedDescription,
            position: normalizedPosition,
            team_id: teamId,
        })
        .select('id, status, description, position, team_id, team:team!inner(id, name, league, location, manager_id)')
        .single()

    if (error) {
        return { ok: false, message: error.message }
    }

    const listing = toListingRecord(data as unknown as ListingRow, 0)

    return {
        ok: true,
        listing,
    }
}

export const getListingsForTeamId = async (teamId: string): Promise<ListingResult> => {
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

    const { data, error } = await supabase
        .from('listing')
        .select('id, status, description, position, team_id, team:team!inner(id, name, league, location, manager_id)')
        .eq('team_id', normalizedTeamId)
        .order('created_at', { ascending: false })

    if (error) {
        return { ok: false, message: error.message }
    }

    const rows = (data ?? []) as unknown as ListingRow[]
    const listingIds = rows.map((listing) => listing.id)
    const applicantCounts = await getApplicantCounts(listingIds)

    return {
        ok: true,
        listings: rows.map((row) => toListingRecord(row, applicantCounts.get(row.id) ?? 0)),
    }
}
