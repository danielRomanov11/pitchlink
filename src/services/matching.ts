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
    listingPreferredPositions?: string[]
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
    listingPreferredPositions: string[]
    listingPreferredPlayerLeagues: string[]
    listingPreferredPlayerLocations: string[]
    teamLeague: string
    teamLocation: string
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
    position: 50,
    league: 30,
    location: 20,
}

const RELATED_POSITION_MAP: Record<string, string[]> = {
    goalkeeper: [],
    'center back': ['left back', 'right back', 'defensive midfielder'],
    'left back': ['center back', 'left midfielder'],
    'right back': ['center back', 'right midfielder'],
    'defensive midfielder': ['center back', 'central midfielder'],
    'central midfielder': ['defensive midfielder', 'attacking midfielder', 'left midfielder', 'right midfielder'],
    'attacking midfielder': ['central midfielder', 'left winger', 'right winger', 'striker'],
    'left midfielder': ['central midfielder', 'left winger', 'left back'],
    'right midfielder': ['central midfielder', 'right winger', 'right back'],
    'left winger': ['left midfielder', 'attacking midfielder', 'striker'],
    'right winger': ['right midfielder', 'attacking midfielder', 'striker'],
    striker: ['left winger', 'right winger', 'attacking midfielder'],
}

const normalizeToken = (value: string) => value.trim().toLowerCase()

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

const parsePlayerPositions = (value: string) =>
    normalizeValues(
        value
            .split(',')
            .map((position) => position.trim())
            .filter((position) => position.length > 0),
    )

const areRelatedPositions = (leftPosition: string, rightPosition: string) => {
    if (leftPosition === rightPosition) {
        return true
    }

    const relatedFromLeft = RELATED_POSITION_MAP[leftPosition] ?? []
    if (relatedFromLeft.includes(rightPosition)) {
        return true
    }

    const relatedFromRight = RELATED_POSITION_MAP[rightPosition] ?? []
    return relatedFromRight.includes(leftPosition)
}

const calculatePositionScore = (
    playerPosition: string,
    listingPosition: string,
    listingPreferredPositions?: string[],
): number | null => {
    const playerPositions = parsePlayerPositions(playerPosition)
    const targetPositions = normalizeValues([listingPosition, ...(listingPreferredPositions ?? [])])

    if (playerPositions.length === 0 || targetPositions.length === 0) {
        return null
    }

    for (const sourcePosition of playerPositions) {
        if (targetPositions.includes(sourcePosition)) {
            return 100
        }
    }

    for (const sourcePosition of playerPositions) {
        for (const targetPosition of targetPositions) {
            if (areRelatedPositions(sourcePosition, targetPosition)) {
                return 75
            }
        }
    }

    return 0
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
    const positionScore = calculatePositionScore(input.playerPosition, input.listingPosition, input.listingPreferredPositions)

    const leagueScore = calculatePreferenceOverlapScore(
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
            listingPreferredPositions: input.listingPreferredPositions,
            listingPreferredPlayerLeagues: input.listingPreferredPlayerLeagues,
            listingPreferredPlayerLocations: input.listingPreferredPlayerLocations,
            teamLeague: input.teamLeague,
            teamLocation: input.teamLocation,
        },
        weights,
    )
}
