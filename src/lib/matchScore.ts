const POSITION_WEIGHT = 0.6
const LEAGUE_WEIGHT = 0.2
const LOCATION_WEIGHT = 0.2

type CanonicalPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST'

type CanonicalLevel = 'professional' | 'semipro' | 'college' | 'amateur' | 'club' | 'highschool'

export type MatchPlayer = {
    positions: string[]
    levelOfPlay?: string | null
}

export type MatchListing = {
    preferredPositions: string[]
    preferredPlayerLeagues: string[]
    preferredPlayerLocations: string[]
    distanceMiles?: number | null
}

export type MatchScoreBreakdown = {
    score: number
    categoryScores: {
        position: number
        levelOfPlay: number
        location: number
    }
    weightedScores: {
        position: number
        levelOfPlay: number
        location: number
    }
}

const clampPercent = (value: number) => {
    if (Number.isNaN(value)) {
        return 0
    }

    return Math.max(0, Math.min(100, value))
}

const normalizeToken = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ')

const positionAliasMap: Record<string, CanonicalPosition> = {
    gk: 'GK',
    goalkeeper: 'GK',
    cb: 'CB',
    'center back': 'CB',
    'centre back': 'CB',
    lb: 'LB',
    'left back': 'LB',
    rb: 'RB',
    'right back': 'RB',
    dm: 'DM',
    'defensive midfielder': 'DM',
    cdm: 'DM',
    cm: 'CM',
    'central midfielder': 'CM',
    cam: 'CAM',
    'attacking midfielder': 'CAM',
    lm: 'LM',
    'left midfielder': 'LM',
    rm: 'RM',
    'right midfielder': 'RM',
    lw: 'LW',
    'left winger': 'LW',
    rw: 'RW',
    'right winger': 'RW',
    st: 'ST',
    striker: 'ST',
    'center forward': 'ST',
    'centre forward': 'ST',
    cf: 'ST',
}

const positionProximityMap: Record<CanonicalPosition, { score80: CanonicalPosition[]; score60: CanonicalPosition[]; score40: CanonicalPosition[] }> = {
    GK: { score80: [], score60: [], score40: [] },
    CB: { score80: ['DM', 'LB', 'RB'], score60: ['CM'], score40: [] },
    LB: { score80: ['RB', 'LM', 'CB'], score60: ['LW', 'DM'], score40: ['RM'] },
    RB: { score80: ['LB', 'RM', 'CB'], score60: ['RW', 'DM'], score40: ['LM'] },
    DM: { score80: ['CM', 'CB'], score60: ['CAM', 'LB', 'RB'], score40: ['ST'] },
    CM: { score80: ['DM', 'CAM', 'LM', 'RM'], score60: ['CB', 'ST', 'LW', 'RW'], score40: ['LB', 'RB'] },
    CAM: { score80: ['CM', 'ST', 'LW', 'RW'], score60: ['LM', 'RM', 'DM'], score40: ['CB'] },
    LM: { score80: ['LW', 'CM', 'RM'], score60: ['CAM', 'LB', 'RB'], score40: ['RW', 'ST'] },
    RM: { score80: ['RW', 'CM', 'LM'], score60: ['CAM', 'RB', 'LB'], score40: ['LW', 'ST'] },
    LW: { score80: ['RW', 'LM'], score60: ['ST', 'CAM'], score40: ['RM'] },
    RW: { score80: ['LW', 'RM'], score60: ['ST', 'CAM'], score40: ['LM'] },
    ST: { score80: ['CAM', 'RW', 'LW'], score60: ['CM'], score40: ['DM'] },
}

const leagueLevels: CanonicalLevel[] = ['professional', 'semipro', 'college', 'amateur', 'club', 'highschool']

const levelAliasMap: Record<string, CanonicalLevel> = {
    professional: 'professional',
    pro: 'professional',
    semipro: 'semipro',
    'semi pro': 'semipro',
    'semi professional': 'semipro',
    college: 'college',
    collegiate: 'college',
    amateur: 'amateur',
    club: 'club',
    highschool: 'highschool',
    'high school': 'highschool',
}

const underqualifiedScoreByGap = [100, 60, 40, 20, 0, 0]
const overqualifiedScoreByGap = [100, 95, 90, 80, 70, 60]

const normalizePosition = (value: string): CanonicalPosition | null => {
    const normalized = normalizeToken(value)
    return positionAliasMap[normalized] ?? null
}

const normalizeLevel = (value: string): CanonicalLevel | null => {
    const normalized = normalizeToken(value)
    return levelAliasMap[normalized] ?? null
}

const uniqueBySet = <T,>(values: T[]) => [...new Set(values)]

const normalizePositions = (positions: string[]) =>
    uniqueBySet(positions.map((position) => normalizePosition(position)).filter((position): position is CanonicalPosition => position !== null))

const normalizeLevels = (levels: string[]) =>
    uniqueBySet(levels.map((level) => normalizeLevel(level)).filter((level): level is CanonicalLevel => level !== null))

const scorePositionPair = (playerPosition: CanonicalPosition, requiredPosition: CanonicalPosition) => {
    if (playerPosition === requiredPosition) {
        return 100
    }

    const requiredPositionMap = positionProximityMap[requiredPosition]

    if (requiredPositionMap.score80.includes(playerPosition)) {
        return 80
    }

    if (requiredPositionMap.score60.includes(playerPosition)) {
        return 60
    }

    if (requiredPositionMap.score40.includes(playerPosition)) {
        return 40
    }

    return 0
}

const calculatePositionScore = (playerPositions: string[], listingPreferredPositions: string[]) => {
    const normalizedRequiredPositions = normalizePositions(listingPreferredPositions)
    if (normalizedRequiredPositions.length === 0) {
        return 100
    }

    const normalizedPlayerPositions = normalizePositions(playerPositions)
    if (normalizedPlayerPositions.length === 0) {
        return 0
    }

    let bestScore = 0

    for (const requiredPosition of normalizedRequiredPositions) {
        for (const playerPosition of normalizedPlayerPositions) {
            bestScore = Math.max(bestScore, scorePositionPair(playerPosition, requiredPosition))

            if (bestScore === 100) {
                return bestScore
            }
        }
    }

    return bestScore
}

const scoreLevelPair = (playerLevel: CanonicalLevel, requiredLevel: CanonicalLevel) => {
    const playerIndex = leagueLevels.indexOf(playerLevel)
    const requiredIndex = leagueLevels.indexOf(requiredLevel)

    if (playerIndex === -1 || requiredIndex === -1) {
        return 0
    }

    if (playerIndex === requiredIndex) {
        return 100
    }

    const gap = Math.abs(playerIndex - requiredIndex)

    if (playerIndex > requiredIndex) {
        return underqualifiedScoreByGap[Math.min(gap, underqualifiedScoreByGap.length - 1)]
    }

    return overqualifiedScoreByGap[Math.min(gap, overqualifiedScoreByGap.length - 1)]
}

const calculateLeagueScore = (playerLevelOfPlay: string | null | undefined, listingPreferredLevels: string[]) => {
    const normalizedRequiredLevels = normalizeLevels(listingPreferredLevels)

    if (normalizedRequiredLevels.length === 0) {
        return 100
    }

    if (!playerLevelOfPlay) {
        return 0
    }

    const normalizedPlayerLevel = normalizeLevel(playerLevelOfPlay)

    if (!normalizedPlayerLevel) {
        return 0
    }

    let bestScore = 0

    for (const requiredLevel of normalizedRequiredLevels) {
        bestScore = Math.max(bestScore, scoreLevelPair(normalizedPlayerLevel, requiredLevel))

        if (bestScore === 100) {
            return bestScore
        }
    }

    return bestScore
}

export const calculateLocationScore = (distanceMiles: number | null | undefined, hasLocationRequirement: boolean) => {
    if (!hasLocationRequirement) {
        return 100
    }

    if (distanceMiles === null || distanceMiles === undefined || !Number.isFinite(distanceMiles)) {
        return 0
    }

    const normalizedDistance = Math.max(0, distanceMiles)
    const penaltySteps = Math.floor(normalizedDistance / 25)

    return clampPercent(100 - penaltySteps * 10)
}

export const calculateMatchScore = (player: MatchPlayer, listing: MatchListing): MatchScoreBreakdown => {
    const positionScore = calculatePositionScore(player.positions, listing.preferredPositions)
    const levelOfPlayScore = calculateLeagueScore(player.levelOfPlay, listing.preferredPlayerLeagues)
    const locationScore = calculateLocationScore(listing.distanceMiles, listing.preferredPlayerLocations.length > 0)

    const weightedPositionScore = positionScore * POSITION_WEIGHT
    const weightedLevelOfPlayScore = levelOfPlayScore * LEAGUE_WEIGHT
    const weightedLocationScore = locationScore * LOCATION_WEIGHT

    const totalScore = Math.round(weightedPositionScore + weightedLevelOfPlayScore + weightedLocationScore)

    return {
        score: clampPercent(totalScore),
        categoryScores: {
            position: positionScore,
            levelOfPlay: levelOfPlayScore,
            location: locationScore,
        },
        weightedScores: {
            position: Number(weightedPositionScore.toFixed(2)),
            levelOfPlay: Number(weightedLevelOfPlayScore.toFixed(2)),
            location: Number(weightedLocationScore.toFixed(2)),
        },
    }
}

export const splitPositionText = (positionsText: string) =>
    positionsText
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
