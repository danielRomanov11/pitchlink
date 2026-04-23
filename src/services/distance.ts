import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

type DistanceResult = {
    distanceMiles: number | null
    destination: string | null
}

type DistanceFunctionResponse = {
    distanceMiles?: number | null
    destination?: string | null
}

const normalizeLocation = (value: string) => value.trim()

export const getDistanceMiles = async (
    originLocation: string | null | undefined,
    destinationLocations: string[],
): Promise<DistanceResult> => {
    const normalizedOrigin = normalizeLocation(originLocation ?? '')
    const normalizedDestinations = destinationLocations.map((value) => normalizeLocation(value)).filter((value) => value.length > 0)

    if (!normalizedOrigin || normalizedDestinations.length === 0) {
        return { distanceMiles: null, destination: null }
    }

    if (!isSupabaseConfigured || !supabase) {
        return { distanceMiles: null, destination: null }
    }

    const { data, error } = await supabase.functions.invoke<DistanceFunctionResponse>('distance-miles', {
        body: {
            origin: normalizedOrigin,
            destinations: normalizedDestinations,
        },
    })

    if (error || !data) {
        return { distanceMiles: null, destination: null }
    }

    const distanceMiles =
        typeof data.distanceMiles === 'number' && Number.isFinite(data.distanceMiles)
            ? Number(data.distanceMiles.toFixed(2))
            : null

    return {
        distanceMiles,
        destination: typeof data.destination === 'string' ? data.destination : null,
    }
}
