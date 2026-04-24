import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

type Coordinates = {
    latitude: number
    longitude: number
}

type GeocodeCandidate = {
    lat?: string
    lon?: string
}

type DistanceRequestPayload = {
    origin?: string
    destinations?: string[]
}

type CacheRow = {
    normalized_location: string
    raw_location: string
    latitude: number
    longitude: number
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeLocation = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

const toRadians = (value: number) => (value * Math.PI) / 180

const haversineMiles = (origin: Coordinates, destination: Coordinates) => {
    const earthRadiusMiles = 3958.8

    const dLat = toRadians(destination.latitude - origin.latitude)
    const dLon = toRadians(destination.longitude - origin.longitude)

    const lat1 = toRadians(origin.latitude)
    const lat2 = toRadians(destination.latitude)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return earthRadiusMiles * c
}

const getSupabaseAdmin = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        return null
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey)
}

const getCachedCoordinates = async (
    supabaseAdmin: ReturnType<typeof createClient>,
    normalizedLocation: string,
): Promise<Coordinates | null> => {
    const { data, error } = await supabaseAdmin
        .from('location_coordinate_cache')
        .select('normalized_location, raw_location, latitude, longitude')
        .eq('normalized_location', normalizedLocation)
        .maybeSingle()

    if (error || !data) {
        return null
    }

    const row = data as CacheRow

    if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) {
        return null
    }

    return {
        latitude: row.latitude,
        longitude: row.longitude,
    }
}

const geocodeWithNominatim = async (location: string): Promise<Coordinates | null> => {
    const params = new URLSearchParams({
        q: location,
        format: 'jsonv2',
        limit: '1',
        addressdetails: '0',
    })

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
            'User-Agent': 'pitchlink-distance-matcher/1.0',
            Accept: 'application/json',
        },
    })

    if (!response.ok) {
        return null
    }

    const payload = (await response.json()) as GeocodeCandidate[]
    const candidate = payload[0]

    if (!candidate?.lat || !candidate?.lon) {
        return null
    }

    const latitude = Number(candidate.lat)
    const longitude = Number(candidate.lon)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null
    }

    return { latitude, longitude }
}

const cacheCoordinates = async (
    supabaseAdmin: ReturnType<typeof createClient>,
    rawLocation: string,
    coordinates: Coordinates,
) => {
    const normalizedLocation = normalizeLocation(rawLocation)

    await supabaseAdmin.from('location_coordinate_cache').upsert(
        {
            normalized_location: normalizedLocation,
            raw_location: rawLocation.trim(),
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            provider: 'nominatim',
        },
        {
            onConflict: 'normalized_location',
        },
    )
}

const resolveCoordinates = async (
    supabaseAdmin: ReturnType<typeof createClient>,
    rawLocation: string,
): Promise<Coordinates | null> => {
    const normalizedLocation = normalizeLocation(rawLocation)

    if (!normalizedLocation) {
        return null
    }

    const cachedCoordinates = await getCachedCoordinates(supabaseAdmin, normalizedLocation)
    if (cachedCoordinates) {
        return cachedCoordinates
    }

    const geocodedCoordinates = await geocodeWithNominatim(rawLocation)
    if (!geocodedCoordinates) {
        return null
    }

    await cacheCoordinates(supabaseAdmin, rawLocation, geocodedCoordinates)

    return geocodedCoordinates
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (!supabaseAdmin) {
        return new Response(JSON.stringify({ error: 'Missing Supabase service role environment variables.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    let payload: DistanceRequestPayload

    try {
        payload = (await request.json()) as DistanceRequestPayload
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const origin = payload.origin?.trim() ?? ''
    const destinations = (payload.destinations ?? []).map((value) => value.trim()).filter((value) => value.length > 0)

    if (!origin || destinations.length === 0) {
        return new Response(
            JSON.stringify({
                distanceMiles: null,
                destination: null,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
        )
    }

    const originCoordinates = await resolveCoordinates(supabaseAdmin, origin)

    if (!originCoordinates) {
        return new Response(JSON.stringify({ distanceMiles: null, destination: null }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    let bestDistance: number | null = null
    let bestDestination: string | null = null

    for (const destination of destinations) {
        const destinationCoordinates = await resolveCoordinates(supabaseAdmin, destination)

        if (!destinationCoordinates) {
            continue
        }

        const distanceMiles = haversineMiles(originCoordinates, destinationCoordinates)

        if (bestDistance === null || distanceMiles < bestDistance) {
            bestDistance = distanceMiles
            bestDestination = destination
        }
    }

    return new Response(
        JSON.stringify({
            distanceMiles: bestDistance === null ? null : Number(bestDistance.toFixed(2)),
            destination: bestDestination,
        }),
        {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
    )
})
