import { useEffect, useMemo, useState } from 'react'
import MatchScoreBar from '../components/MatchScoreBar'
import { calculateMatchScore, splitPositionText, type MatchScoreBreakdown } from '../lib/matchScore'
import SiteNavbar from '../components/SiteNavbar'
import type { UserRole } from '../services/auth'
import { getDistanceMiles } from '../services/distance'
import { getListingPreferences, getCurrentPlayerPreference, getPlayerPreferencesByUserIds } from '../services/preference'
import { getPlayersForMatching, type PlayerDirectoryRecord } from '../services/playerDirectory'
import { getListingsForCurrentUser, type ListingRecord } from '../services/listing'
import { getCurrentProfile } from '../services/profile'

type ScoredListing = {
    listing: ListingRecord
    scoreBreakdown: MatchScoreBreakdown
    matchedLocation: string | null
}

type ScoredPlayer = {
    player: PlayerDirectoryRecord
    scoreBreakdown: MatchScoreBreakdown
    matchedLocation: string | null
}

type ManagerScoredListing = {
    listing: ListingRecord
    topPlayers: ScoredPlayer[]
}

const formatPlayerLabel = (userId: string) => `Player ${userId.slice(0, 8)}`

const ForYouPage = () => {
    const [role, setRole] = useState<UserRole>('player')
    const [scoredListings, setScoredListings] = useState<ScoredListing[]>([])
    const [managerScoredListings, setManagerScoredListings] = useState<ManagerScoredListing[]>([])
    const [isLoadingSignals, setIsLoadingSignals] = useState(true)
    const [signalsError, setSignalsError] = useState<string | null>(null)

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    const topScoredListings = useMemo(() => scoredListings.slice(0, 5), [scoredListings])
    const totalManagerPlayerRanks = useMemo(
        () => managerScoredListings.reduce((sum, listingScore) => sum + listingScore.topPlayers.length, 0),
        [managerScoredListings],
    )

    useEffect(() => {
        const loadRole = async () => {
            setIsLoadingSignals(true)
            setSignalsError(null)

            const result = await getCurrentProfile()

            if (!result.ok || !result.profile) {
                setIsLoadingSignals(false)
                setSignalsError(result.message ?? 'Unable to load recommendation context right now.')
                return
            }

            setRole(result.profile.role)

            if (result.profile.role === 'player') {
                setManagerScoredListings([])

                const listingsResult = await getListingsForCurrentUser('player')

                if (!listingsResult.ok || !listingsResult.listings) {
                    setSignalsError(listingsResult.message ?? 'Unable to load listings for scoring.')
                    setIsLoadingSignals(false)
                    return
                }

                const [listingPreferencesResult, playerPreferenceResult] = await Promise.all([
                    getListingPreferences(listingsResult.listings.map((listing) => listing.id)),
                    getCurrentPlayerPreference(),
                ])

                if (!playerPreferenceResult.ok) {
                    setSignalsError(playerPreferenceResult.message ?? 'Unable to load player preference data.')
                    setIsLoadingSignals(false)
                    return
                }

                const preferenceLookup = listingPreferencesResult.ok
                    ? listingPreferencesResult.preferencesByListingId ?? {}
                    : {}

                const playerPositions = splitPositionText(result.profile.position)
                const playerLevel = playerPreferenceResult.preference?.preferredLeagues[0] ?? null
                const playerLocation = playerPreferenceResult.preference?.preferredLocations[0] ?? null

                const scoredCards = await Promise.all(
                    listingsResult.listings.map(async (listing) => {
                        const listingPreference = preferenceLookup[listing.id]

                        const preferredPositions =
                            listingPreference?.preferredPositions.length
                                ? listingPreference.preferredPositions
                                : [listing.position]

                        const preferredPlayerLeagues = listingPreference?.preferredPlayerLeagues ?? []

                        const preferredPlayerLocations =
                            listingPreference?.preferredPlayerLocations.length
                                ? listingPreference.preferredPlayerLocations
                                : listing.teamLocation.trim()
                                    ? [listing.teamLocation]
                                    : []

                        const distanceResult = await getDistanceMiles(playerLocation, preferredPlayerLocations)

                        return {
                            listing,
                            matchedLocation: distanceResult.destination,
                            scoreBreakdown: calculateMatchScore(
                                {
                                    positions: playerPositions,
                                    levelOfPlay: playerLevel,
                                },
                                {
                                    preferredPositions,
                                    preferredPlayerLeagues,
                                    preferredPlayerLocations,
                                    distanceMiles: distanceResult.distanceMiles,
                                },
                            ),
                        }
                    }),
                )

                setScoredListings(scoredCards.sort((a, b) => b.scoreBreakdown.score - a.scoreBreakdown.score))

                if (!listingPreferencesResult.ok && listingPreferencesResult.message) {
                    setSignalsError(`Scored with fallback defaults: ${listingPreferencesResult.message}`)
                }

                setIsLoadingSignals(false)
                return
            }

            setScoredListings([])

            const managerListingsResult = await getListingsForCurrentUser('manager')

            if (!managerListingsResult.ok || !managerListingsResult.listings) {
                setSignalsError(managerListingsResult.message ?? 'Unable to load your listings for scoring.')
                setIsLoadingSignals(false)
                return
            }

            const [listingPreferencesResult, playersResult] = await Promise.all([
                getListingPreferences(managerListingsResult.listings.map((listing) => listing.id)),
                getPlayersForMatching(),
            ])

            if (!playersResult.ok || !playersResult.players) {
                setSignalsError(playersResult.message ?? 'Unable to load candidate players for scoring.')
                setIsLoadingSignals(false)
                return
            }

            const candidatePlayers = playersResult.players

            const playerPreferenceLookupResult = await getPlayerPreferencesByUserIds(
                candidatePlayers.map((player) => player.userId),
            )

            const listingPreferenceLookup = listingPreferencesResult.ok
                ? listingPreferencesResult.preferencesByListingId ?? {}
                : {}

            const playerPreferenceLookup = playerPreferenceLookupResult.ok
                ? playerPreferenceLookupResult.preferencesByUserId ?? {}
                : {}

            const distanceCache = new Map<string, ReturnType<typeof getDistanceMiles>>()

            const getCachedDistance = (originLocation: string | null, destinationLocations: string[]) => {
                const originKey = originLocation?.trim() ?? ''
                const destinationKey = destinationLocations.join('|')
                const cacheKey = `${originKey}::${destinationKey}`

                if (!distanceCache.has(cacheKey)) {
                    distanceCache.set(cacheKey, getDistanceMiles(originLocation, destinationLocations))
                }

                return distanceCache.get(cacheKey)!
            }

            const listingPlayerScores = await Promise.all(
                managerListingsResult.listings.map(async (listing) => {
                    const listingPreference = listingPreferenceLookup[listing.id]
                    const preferredPositions =
                        listingPreference?.preferredPositions.length
                            ? listingPreference.preferredPositions
                            : [listing.position]
                    const preferredPlayerLeagues = listingPreference?.preferredPlayerLeagues ?? []
                    const preferredPlayerLocations =
                        listingPreference?.preferredPlayerLocations.length
                            ? listingPreference.preferredPlayerLocations
                            : listing.teamLocation.trim()
                                ? [listing.teamLocation]
                                : []

                    const scoredPlayers = await Promise.all(
                        candidatePlayers.map(async (player) => {
                            const playerPreference = playerPreferenceLookup[player.userId]
                            const playerLocation = playerPreference?.preferredLocations[0] ?? null

                            const distanceResult = await getCachedDistance(playerLocation, preferredPlayerLocations)

                            return {
                                player,
                                matchedLocation: distanceResult.destination,
                                scoreBreakdown: calculateMatchScore(
                                    {
                                        positions: splitPositionText(player.position),
                                        levelOfPlay: playerPreference?.preferredLeagues[0] ?? null,
                                    },
                                    {
                                        preferredPositions,
                                        preferredPlayerLeagues,
                                        preferredPlayerLocations,
                                        distanceMiles: distanceResult.distanceMiles,
                                    },
                                ),
                            }
                        }),
                    )

                    return {
                        listing,
                        topPlayers: scoredPlayers
                            .sort((a, b) => b.scoreBreakdown.score - a.scoreBreakdown.score)
                            .slice(0, 3),
                    }
                }),
            )

            setManagerScoredListings(
                listingPlayerScores.sort(
                    (a, b) => (b.topPlayers[0]?.scoreBreakdown.score ?? -1) - (a.topPlayers[0]?.scoreBreakdown.score ?? -1),
                ),
            )

            const warningMessages: string[] = []

            if (!listingPreferencesResult.ok && listingPreferencesResult.message) {
                warningMessages.push(`listing preference fallback used: ${listingPreferencesResult.message}`)
            }

            if (!playerPreferenceLookupResult.ok && playerPreferenceLookupResult.message) {
                warningMessages.push(`player preference fallback used: ${playerPreferenceLookupResult.message}`)
            }

            if (warningMessages.length > 0) {
                setSignalsError(`Scored with fallback defaults: ${warningMessages.join(' | ')}`)
            }

            setIsLoadingSignals(false)
        }

        void loadRole()
    }, [])

    return (
        <main className="app-page foryou-page">
            <section className="app-hero foryou-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />
                <div className="app-hero-content">
                    <p className="eyebrow">For You</p>
                    <h1>Personalized fit and priority insights.</h1>
                    <p className="lead-copy">
                        Match-focused dashboard scaffold for the advanced recommendation feature planned later.
                    </p>
                </div>
            </section>

            <section className="app-section foryou-page-grid" aria-label="Recommendation modules">
                <article className="app-card">
                    <p className="card-kicker">Match Signals</p>
                    <h3>{role === 'player' ? 'Best fit listings' : 'Best fit players'}</h3>


                    {role === 'player' ? (
                        <div className="mt-4 space-y-3">
                            {isLoadingSignals && <div className="empty-slot">Calculating fit scores...</div>}

                            {!isLoadingSignals && topScoredListings.length === 0 && (
                                <div className="empty-slot">No match signals yet.</div>
                            )}

                            {!isLoadingSignals &&
                                topScoredListings.map((entry) => (
                                    <article
                                        className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-[0_10px_25px_rgba(0,0,0,0.25)]"
                                        key={entry.listing.id}
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="m-0 text-sm font-semibold text-slate-100">{entry.listing.teamName}</p>
                                                <p className="m-0 text-xs uppercase tracking-[0.12em] text-slate-300">
                                                    {entry.listing.position}
                                                </p>
                                            </div>
                                            <p className="m-0 rounded-full border border-white/20 px-2 py-1 text-xs text-slate-200">
                                                {entry.listing.status}
                                            </p>
                                        </div>

                                        <MatchScoreBar score={entry.scoreBreakdown.score} label="Fit score" />

                                        <p className="mt-3 mb-0 text-xs text-slate-300">
                                            Position {entry.scoreBreakdown.categoryScores.position}% · Level {entry.scoreBreakdown.categoryScores.levelOfPlay}% · Location {entry.scoreBreakdown.categoryScores.location}%
                                        </p>

                                        {entry.matchedLocation && (
                                            <p className="mt-2 mb-0 text-xs text-slate-400">Closest matched location: {entry.matchedLocation}</p>
                                        )}
                                    </article>
                                ))}
                        </div>
                    ) : (
                        <div className="mt-4 space-y-4">
                            {isLoadingSignals && <div className="empty-slot">Calculating fit scores...</div>}

                            {!isLoadingSignals && managerScoredListings.length === 0 && (
                                <div className="empty-slot">No listings or candidate players available to score yet.</div>
                            )}

                            {!isLoadingSignals &&
                                managerScoredListings.map((listingScore) => (
                                    <article
                                        className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 shadow-[0_10px_25px_rgba(0,0,0,0.25)]"
                                        key={listingScore.listing.id}
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="m-0 text-sm font-semibold text-slate-100">{listingScore.listing.teamName}</p>
                                                <p className="m-0 text-xs uppercase tracking-[0.12em] text-slate-300">
                                                    {listingScore.listing.position}
                                                </p>
                                            </div>
                                            <p className="m-0 rounded-full border border-white/20 px-2 py-1 text-xs text-slate-200">
                                                Top {listingScore.topPlayers.length}
                                            </p>
                                        </div>

                                        {listingScore.topPlayers.length === 0 ? (
                                            <div className="empty-slot">No player profiles with positions available yet.</div>
                                        ) : (
                                            <div className="space-y-3">
                                                {listingScore.topPlayers.map((playerScore) => (
                                                    <article
                                                        className="rounded-xl border border-white/10 bg-slate-900/40 p-3"
                                                        key={`${listingScore.listing.id}-${playerScore.player.userId}`}
                                                    >
                                                        <div className="mb-2 flex items-start justify-between gap-3">
                                                            <p className="m-0 text-sm font-semibold text-slate-100">
                                                                {formatPlayerLabel(playerScore.player.userId)}
                                                            </p>
                                                            <p className="m-0 text-xs text-slate-300">{playerScore.scoreBreakdown.score}%</p>
                                                        </div>

                                                        <MatchScoreBar score={playerScore.scoreBreakdown.score} label="Fit score" />

                                                        <p className="mt-2 mb-0 text-xs text-slate-300">
                                                            Position {playerScore.scoreBreakdown.categoryScores.position}% · Level {playerScore.scoreBreakdown.categoryScores.levelOfPlay}% · Location {playerScore.scoreBreakdown.categoryScores.location}%
                                                        </p>

                                                        {playerScore.matchedLocation && (
                                                            <p className="mt-1 mb-0 text-xs text-slate-400">
                                                                Closest matched location: {playerScore.matchedLocation}
                                                            </p>
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                ))}
                        </div>
                    )}

                    {signalsError && <p className="form-status error">{signalsError}</p>}
                </article>


                <article className="app-card app-card-wide">
                    <p className="card-kicker">Recommendations</p>
                    <h3>{role === 'player' ? 'Suggested teams and listings' : 'Suggested players and fit scores'}</h3>
                    <p>
                        {role === 'player'
                            ? 'Listings are ranked by fit score and will expand with richer preference data.'
                            : 'Manager recommendation panel will use the same weighted scoring model.'}
                    </p>
                    <div className="empty-slot">
                        {role === 'player'
                            ? `Scored ${scoredListings.length} listing${scoredListings.length === 1 ? '' : 's'}.`
                            : `Ranked ${totalManagerPlayerRanks} player fit${totalManagerPlayerRanks === 1 ? '' : 's'} across ${managerScoredListings.length} listing${managerScoredListings.length === 1 ? '' : 's'}.`}
                    </div>
                </article>
            </section>

        </main>
    )
}

export default ForYouPage
