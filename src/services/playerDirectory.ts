import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser } from './auth'

const missingConfigMessage = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'

export type PlayerDirectoryRecord = {
    userId: string
    position: string
    bio: string
    videoUrl: string
}

type PlayerDirectoryResult = {
    ok: boolean
    message?: string
    players?: PlayerDirectoryRecord[]
}

type PlayerDirectoryLookupResult = {
    ok: boolean
    message?: string
    playersByUserId?: Record<string, PlayerDirectoryRecord>
}

type PlayerDirectoryRow = {
    user_id: string
    position: string | null
    bio: string | null
    url: string | null
}

const toPlayerDirectoryRecord = (row: PlayerDirectoryRow): PlayerDirectoryRecord => ({
    userId: row.user_id,
    position: row.position?.trim() ?? '',
    bio: row.bio ?? '',
    videoUrl: row.url ?? '',
})

export const getPlayersForMatching = async (limit = 60): Promise<PlayerDirectoryResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const cappedLimit = Math.max(1, Math.min(200, limit))

    const { data, error } = await supabase
        .from('player')
        .select('user_id, position, bio, url')
        .not('position', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(cappedLimit)

    if (error) {
        return { ok: false, message: error.message }
    }

    return {
        ok: true,
        players: ((data ?? []) as PlayerDirectoryRow[])
            .map(toPlayerDirectoryRecord)
            .filter((player) => player.position.length > 0),
    }
}

export const getPlayersByUserIds = async (userIds: string[]): Promise<PlayerDirectoryLookupResult> => {
    if (!isSupabaseConfigured || !supabase) {
        return { ok: false, message: missingConfigMessage }
    }

    const normalizedUserIds = userIds.map((userId) => userId.trim()).filter((userId) => userId.length > 0)

    if (normalizedUserIds.length === 0) {
        return { ok: true, playersByUserId: {} }
    }

    const user = await getCurrentUser()

    if (!user) {
        return { ok: false, message: 'No active session. Sign in to continue.' }
    }

    const { data, error } = await supabase
        .from('player')
        .select('user_id, position, bio, url')
        .in('user_id', normalizedUserIds)

    if (error) {
        return { ok: false, message: error.message }
    }

    const playersByUserId = ((data ?? []) as PlayerDirectoryRow[]).reduce<Record<string, PlayerDirectoryRecord>>(
        (accumulator, row) => {
            const mappedPlayer = toPlayerDirectoryRecord(row)

            if (mappedPlayer.position.length > 0) {
                accumulator[mappedPlayer.userId] = mappedPlayer
            }

            return accumulator
        },
        {},
    )

    return { ok: true, playersByUserId }
}
