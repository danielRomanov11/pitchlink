import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser, type UserRole } from './auth'

export type TeamRecord = {
    id: string
    name: string
    league: string
    location: string
    url: string
    managerId: string
}

type TeamResult = {
    ok: boolean
    message?: string
    teams?: TeamRecord[]
}

type TeamCreatePayload = {
    name: string
    league: string
    location: string
    url?: string
}

type TeamCreateResult = {
    ok: boolean
    message?: string
    team?: TeamRecord
}

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

const mapTeamRow = (row: {
    id: string
    name: string
    league: string
    location: string
    url: string | null
    manager_id: string
}): TeamRecord => ({
    id: row.id,
    name: row.name,
    league: row.league,
    location: row.location,
    url: row.url ?? '',
    managerId: row.manager_id,
})

export const getTeamsForCurrentUser = async (role: UserRole): Promise<TeamResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    let query = supabase
        .from('team')
        .select('id, name, league, location, url, manager_id')
        .order('created_at', { ascending: false })

    if (role === 'manager') {
        query = query.eq('manager_id', user.id)
    }

    const { data, error } = await query

    if (error) {
        return { ok: false, message: error.message }
    }

    return {
        ok: true,
        teams: (data ?? []).map((row) =>
            mapTeamRow(
                row as {
                    id: string
                    name: string
                    league: string
                    location: string
                    url: string | null
                    manager_id: string
                },
            ),
        ),
    }
}

export const createTeam = async ({ name, league, location, url }: TeamCreatePayload): Promise<TeamCreateResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const normalizedName = name.trim()
    const normalizedLeague = league.trim()
    const normalizedLocation = location.trim()

    if (!normalizedName || !normalizedLeague || !normalizedLocation) {
        return { ok: false, message: 'Team name, league, and location are required.' }
    }

    const { data, error } = await supabase
        .from('team')
        .insert({
            name: normalizedName,
            league: normalizedLeague,
            location: normalizedLocation,
            url: url?.trim() || null,
            manager_id: user.id,
        })
        .select('id, name, league, location, url, manager_id')
        .single()

    if (error) {
        return { ok: false, message: error.message }
    }

    return {
        ok: true,
        team: mapTeamRow(
            data as {
                id: string
                name: string
                league: string
                location: string
                url: string | null
                manager_id: string
            },
        ),
    }
}
