export type MatchWeights = {
    position: number
    league: number
    location: number
}

export type MatchScoreBreakdown = {
    totalScore: number
    positionScore: number | null
    leagueScore: number | null
    locationScore: number | null
}

export type PlayerListingMatchInput = {
    playerPosition: string
    playerPreferredLeagues: string[]
    playerPreferredLocations: string[]
    listingPosition: string
    listingPreferredPlayerLeagues?: string[]
    listingPreferredPlayerLocations?: string[]
    teamLeague: string
    teamLocation: string
}

export type ApplicationFitInput = {
    playerPosition: string
    playerPreferredLeagues: string[]
    playerPreferredLocations: string[]
    listingPosition: string
    listingPreferredPlayerLeagues: string[]
    listingPreferredPlayerLocations: string[]
    teamLeague: string
    teamLocation: string
}

type LeagueTier = 'professional' | 'semipro' | 'amateur' | 'club' | 'college' | 'high school'

type PositionName =
    | 'goalkeeper'
    | 'center back'
    | 'left back'
    | 'right back'
    | 'defensive midfielder'
    | 'central midfielder'
    | 'attacking midfielder'
    | 'left midfielder'
    | 'right midfielder'
    | 'left winger'
    | 'right winger'
    | 'striker'

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
    position: 50,
    league: 30,
    location: 20,
}

const LEAGUE_TIER_ALIASES: Record<string, LeagueTier> = {
    professional: 'professional',
    pro: 'professional',
    semipro: 'semipro',
    'semi pro': 'semipro',
    'semi-pro': 'semipro',
    amateur: 'amateur',
    amatuer: 'amateur',
    club: 'club',
    college: 'college',
    collegiate: 'college',
    'high school': 'high school',
    highschool: 'high school',
    'high-school': 'high school',
    hs: 'high school',
}

const POSITION_ALIASES: Record<string, PositionName> = {
    goalkeeper: 'goalkeeper',
    gk: 'goalkeeper',
    'center back': 'center back',
    cb: 'center back',
    'left back': 'left back',
    lb: 'left back',
    'right back': 'right back',
    rb: 'right back',
    'defensive midfielder': 'defensive midfielder',
    cdm: 'defensive midfielder',
    dm: 'defensive midfielder',
    'central midfielder': 'central midfielder',
    cm: 'central midfielder',
    'attacking midfielder': 'attacking midfielder',
    cam: 'attacking midfielder',
    am: 'attacking midfielder',
    'left midfielder': 'left midfielder',
    lm: 'left midfielder',
    'right midfielder': 'right midfielder',
    rm: 'right midfielder',
    'left winger': 'left winger',
    lw: 'left winger',
    'right winger': 'right winger',
    rw: 'right winger',
    striker: 'striker',
    st: 'striker',
    cf: 'striker',
}

const LEAGUE_TIER_DISPLAY_BY_KEY: Record<LeagueTier, string> = {
    professional: 'Professional',
    semipro: 'SemiPro',
    amateur: 'Amateur',
    club: 'Club',
    college: 'College',
    'high school': 'High School',
}

export const LEAGUE_TIER_OPTIONS = [
    LEAGUE_TIER_DISPLAY_BY_KEY.professional,
    LEAGUE_TIER_DISPLAY_BY_KEY.semipro,
    LEAGUE_TIER_DISPLAY_BY_KEY.amateur,
    LEAGUE_TIER_DISPLAY_BY_KEY.club,
    LEAGUE_TIER_DISPLAY_BY_KEY.college,
    LEAGUE_TIER_DISPLAY_BY_KEY['high school'],
] as const

const LEAGUE_LADDER_SCORE_BY_SOURCE: Record<LeagueTier, Record<LeagueTier, number>> = {
    professional: {
        professional: 100,
        semipro: 85,
        amateur: 60,
        club: 45,
        college: 35,
        'high school': 20,
    },
    semipro: {
        semipro: 100,
        amateur: 80,
        professional: 60,
        club: 65,
        college: 50,
        'high school': 30,
    },
    amateur: {
        amateur: 100,
        semipro: 80,
        professional: 50,
        club: 75,
        college: 70,
        'high school': 55,
    },
    club: {
        club: 100,
        amateur: 80,
        semipro: 65,
        professional: 40,
        college: 75,
        'high school': 60,
    },
    college: {
        college: 100,
        club: 80,
        amateur: 65,
        semipro: 50,
        professional: 35,
        'high school': 70,
    },
    'high school': {
        'high school': 100,
        college: 80,
        club: 70,
        amateur: 60,
        semipro: 40,
        professional: 20,
    },
}

const POSITION_SCORE_BY_TARGET: Record<PositionName, Partial<Record<PositionName, number>>> = {
    goalkeeper: {
        goalkeeper: 100,
    },
    'center back': {
        'center back': 100,
        'left back': 80,
        'right back': 80,
        'defensive midfielder': 60,
    },
    'left back': {
        'left back': 100,
        'center back': 80,
        'left midfielder': 80,
        'right back': 60,
        'defensive midfielder': 60,
    },
    'right back': {
        'right back': 100,
        'center back': 80,
        'right midfielder': 80,
        'left back': 60,
        'defensive midfielder': 60,
    },
    'defensive midfielder': {
        'defensive midfielder': 100,
        'central midfielder': 80,
        'center back': 80,
        'left back': 60,
        'right back': 60,
    },
    'central midfielder': {
        'central midfielder': 100,
        'defensive midfielder': 80,
        'attacking midfielder': 80,
        'left midfielder': 60,
        'right midfielder': 60,
    },
    'attacking midfielder': {
        'attacking midfielder': 100,
        'central midfielder': 80,
        'left winger': 80,
        'right winger': 80,
        striker: 60,
        'left midfielder': 60,
        'right midfielder': 60,
    },
    'left midfielder': {
        'left midfielder': 100,
        'left winger': 80,
        'central midfielder': 80,
        'left back': 60,
        'attacking midfielder': 60,
        'right midfielder': 60,
    },
    'right midfielder': {
        'right midfielder': 100,
        'right winger': 80,
        'central midfielder': 80,
        'right back': 60,
        'attacking midfielder': 60,
        'left midfielder': 60,
    },
    'left winger': {
        'left winger': 100,
        'left midfielder': 80,
        'right winger': 80,
        'right midfielder': 60,
        'attacking midfielder': 60,
        striker: 60,
    },
    'right winger': {
        'right winger': 100,
        'right midfielder': 80,
        'left winger': 80,
        'left midfielder': 60,
        'attacking midfielder': 60,
        striker: 60,
    },
    striker: {
        striker: 100,
        'left winger': 80,
        'right winger': 80,
        'attacking midfielder': 60,
        'left midfielder': 60,
        'right midfielder': 60,
    },
}

const normalizeToken = (value: string) => value.trim().toLowerCase()

const toLeagueTier = (value: string): LeagueTier | null => {
    return LEAGUE_TIER_ALIASES[normalizeToken(value)] ?? null
}

const toPositionName = (value: string): PositionName | null => {
    return POSITION_ALIASES[normalizeToken(value)] ?? null
}

const toLeagueTierDisplay = (value: string): string | null => {
    const normalizedTier = toLeagueTier(value)

    if (!normalizedTier) {
        return null
    }

    return LEAGUE_TIER_DISPLAY_BY_KEY[normalizedTier]
}

const normalizeValues = (values: string[]) => {
    const deduped = new Set<string>()

    for (const value of values) {
        const normalized = normalizeToken(value)

        if (!normalized) {
            continue
        }

        deduped.add(normalized)
    }

    return [...deduped]
}

export const normalizeLeagueTierValues = (values: string[]) => {
    const dedupedLeagueTiers = new Set<string>()

    for (const value of values) {
        const normalizedTier = toLeagueTierDisplay(value)

        if (!normalizedTier) {
            continue
        }

        dedupedLeagueTiers.add(normalizedTier)
    }

    return [...dedupedLeagueTiers]
}

const parsePlayerPositions = (value: string) =>
    normalizeValues(
        value
            .split(',')
            .map((position) => position.trim())
            .filter((position) => position.length > 0),
    )

const calculatePositionScore = (
    playerPosition: string,
    listingPosition: string,
): number | null => {
    const playerPositions = parsePlayerPositions(playerPosition)
    const normalizedListingPosition = toPositionName(listingPosition)

    if (playerPositions.length === 0 || !normalizedListingPosition) {
        return null
    }

    let bestScore = 0

    for (const sourcePosition of playerPositions) {
        const normalizedSourcePosition = toPositionName(sourcePosition)

        if (!normalizedSourcePosition) {
            continue
        }

        const candidateScore = POSITION_SCORE_BY_TARGET[normalizedListingPosition][normalizedSourcePosition] ?? 0

        if (candidateScore > bestScore) {
            bestScore = candidateScore
        }
    }

    return bestScore
}

const calculateLeagueTierScore = (
    playerPreferenceValues: string[],
    listingPreferenceValues: string[],
    fallbackTeamValue: string,
): number | null => {
    const normalizedPlayerValues = Array.from(new Set(playerPreferenceValues.map(toLeagueTier).filter((value): value is LeagueTier => value !== null)))
    const normalizedListingValues = Array.from(new Set(listingPreferenceValues.map(toLeagueTier).filter((value): value is LeagueTier => value !== null)))
    const normalizedFallback = toLeagueTier(fallbackTeamValue)
    const effectiveTargetValues =
        normalizedListingValues.length > 0
            ? normalizedListingValues
            : normalizedFallback
                ? [normalizedFallback]
                : []

    if (normalizedPlayerValues.length === 0 || effectiveTargetValues.length === 0) {
        return null
    }

    let bestScore = 0

    for (const sourceTier of normalizedPlayerValues) {
        for (const targetTier of effectiveTargetValues) {
            const candidateScore = LEAGUE_LADDER_SCORE_BY_SOURCE[sourceTier][targetTier] ?? 0

            if (candidateScore > bestScore) {
                bestScore = candidateScore
            }
        }
    }

    return bestScore
}

const calculatePreferenceOverlapScore = (
    playerPreferenceValues: string[],
    listingPreferenceValues: string[],
    fallbackTeamValue: string,
): number | null => {
    const normalizedPlayerValues = normalizeValues(playerPreferenceValues)
    const normalizedListingValues = normalizeValues(listingPreferenceValues)
    const normalizedFallback = normalizeToken(fallbackTeamValue)
    const effectiveTargetValues =
        normalizedListingValues.length > 0
            ? normalizedListingValues
            : normalizedFallback
                ? [normalizedFallback]
                : []

    if (normalizedPlayerValues.length === 0 || effectiveTargetValues.length === 0) {
        return null
    }

    const matchingCount = normalizedPlayerValues.filter((value) => effectiveTargetValues.includes(value)).length

    if (matchingCount === 0) {
        return 0
    }

    return Math.round((matchingCount / Math.max(normalizedPlayerValues.length, effectiveTargetValues.length)) * 100)
}

const calculateWeightedMatch = (
    breakdown: Omit<MatchScoreBreakdown, 'totalScore'>,
    weights: MatchWeights,
): MatchScoreBreakdown => {
    const weightedFactors: Array<{ value: number; weight: number }> = []

    if (breakdown.positionScore !== null) {
        weightedFactors.push({ value: breakdown.positionScore, weight: weights.position })
    }

    if (breakdown.leagueScore !== null) {
        weightedFactors.push({ value: breakdown.leagueScore, weight: weights.league })
    }

    if (breakdown.locationScore !== null) {
        weightedFactors.push({ value: breakdown.locationScore, weight: weights.location })
    }

    if (weightedFactors.length === 0) {
        return {
            ...breakdown,
            totalScore: 0,
        }
    }

    const totalWeight = weightedFactors.reduce((sum, factor) => sum + factor.weight, 0)

    const totalScore = weightedFactors.reduce((sum, factor) => {
        return sum + factor.value * (factor.weight / totalWeight)
    }, 0)

    return {
        ...breakdown,
        totalScore: Math.round(totalScore),
    }
}

export const calculatePlayerListingMatchScore = (
    input: PlayerListingMatchInput,
    weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
): MatchScoreBreakdown => {
    const positionScore = calculatePositionScore(input.playerPosition, input.listingPosition)

    const leagueScore = calculateLeagueTierScore(
        input.playerPreferredLeagues,
        input.listingPreferredPlayerLeagues ?? [],
        input.teamLeague,
    )

    const locationScore = calculatePreferenceOverlapScore(
        input.playerPreferredLocations,
        input.listingPreferredPlayerLocations ?? [],
        input.teamLocation,
    )

    return calculateWeightedMatch(
        {
            positionScore,
            leagueScore,
            locationScore,
        },
        weights,
    )
}

export const calculateApplicationFitScore = (
    input: ApplicationFitInput,
    weights: MatchWeights = DEFAULT_MATCH_WEIGHTS,
): MatchScoreBreakdown => {
    return calculatePlayerListingMatchScore(
        {
            playerPosition: input.playerPosition,
            playerPreferredLeagues: input.playerPreferredLeagues,
            playerPreferredLocations: input.playerPreferredLocations,
            listingPosition: input.listingPosition,
            listingPreferredPlayerLeagues: input.listingPreferredPlayerLeagues,
            listingPreferredPlayerLocations: input.listingPreferredPlayerLocations,
            teamLeague: input.teamLeague,
            teamLocation: input.teamLocation,
        },
        weights,
    )
}
