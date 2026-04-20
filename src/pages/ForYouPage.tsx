import { useEffect, useMemo, useState } from 'react'
import SiteNavbar from '../components/SiteNavbar'
import { getApplicationsForCurrentUser, type ApplicationRecord } from '../services/application'
import type { UserRole } from '../services/auth'
import { calculateApplicationFitScore, calculatePlayerListingMatchScore } from '../services/matching'
import { getCurrentProfile, type CurrentProfile } from '../services/profile'
import { getListingsForCurrentUser, type ListingRecord } from '../services/listing'

const ForYouPage = () => {
    const [role, setRole] = useState<UserRole>('player')
    const [profile, setProfile] = useState<CurrentProfile | null>(null)
    const [listings, setListings] = useState<ListingRecord[]>([])
    const [applications, setApplications] = useState<ApplicationRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    useEffect(() => {
        const loadRole = async () => {
            setIsLoading(true)
            setStatusMessage(null)

            const result = await getCurrentProfile()

            if (!result.ok || !result.profile) {
                setStatusMessage(result.message ?? 'Unable to load recommendations right now.')
                setIsLoading(false)
                return
            }

            const currentProfile = result.profile
            setRole(currentProfile.role)
            setProfile(currentProfile)

            if (currentProfile.role === 'player') {
                const listingResult = await getListingsForCurrentUser('player')

                if (!listingResult.ok) {
                    setStatusMessage(listingResult.message ?? 'Unable to load listing recommendations.')
                    setIsLoading(false)
                    return
                }

                setListings(listingResult.listings ?? [])
                setApplications([])
                setIsLoading(false)
                return
            }

            const applicationResult = await getApplicationsForCurrentUser('manager')

            if (!applicationResult.ok) {
                setStatusMessage(applicationResult.message ?? 'Unable to load applicant recommendations.')
                setIsLoading(false)
                return
            }

            setApplications(applicationResult.applications ?? [])
            setListings([])
            setIsLoading(false)
        }

        void loadRole()
    }, [])

    const playerRecommendations = useMemo(() => {
        if (!profile || role !== 'player') {
            return [] as Array<{ listing: ListingRecord; score: number }>
        }

        return listings
            .map((listing) => {
                const score = calculatePlayerListingMatchScore({
                    playerPosition: profile.position,
                    playerPreferredLeagues: profile.preferredLeagues,
                    playerPreferredLocations: profile.preferredLocations,
                    listingPosition: listing.position,
                    listingPreferredPlayerLeagues: listing.preferredPlayerLeagues,
                    listingPreferredPlayerLocations: listing.preferredPlayerLocations,
                    teamLeague: listing.teamLeague,
                    teamLocation: listing.teamLocation,
                }).totalScore

                return {
                    listing,
                    score,
                }
            })
            .sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)
            .slice(0, 5)
    }, [listings, profile, role])

    const managerRecommendations = useMemo(() => {
        if (role !== 'manager') {
            return [] as Array<{ application: ApplicationRecord; score: number }>
        }

        return applications
            .map((application) => {
                const score = calculateApplicationFitScore({
                    playerPosition: application.playerPosition,
                    playerPreferredLeagues: application.playerPreferredLeagues,
                    playerPreferredLocations: application.playerPreferredLocations,
                    listingPosition: application.listingPosition,
                    listingPreferredPlayerLeagues: application.listingPreferredPlayerLeagues,
                    listingPreferredPlayerLocations: application.listingPreferredPlayerLocations,
                    teamLeague: application.teamLeague,
                    teamLocation: application.teamLocation,
                }).totalScore

                return {
                    application,
                    score,
                }
            })
            .sort((leftEntry, rightEntry) => rightEntry.score - leftEntry.score)
            .slice(0, 5)
    }, [applications, role])

    const topPlayerScore = playerRecommendations[0]?.score ?? 0
    const topManagerScore = managerRecommendations[0]?.score ?? 0

    const playerPriorities = useMemo(() => {
        if (!profile || role !== 'player') {
            return [] as string[]
        }

        const gaps: string[] = []

        if (!profile.position.trim()) {
            gaps.push('Add at least one playing position to improve position matching.')
        }

        if (profile.preferredLeagues.length === 0) {
            gaps.push('Add preferred league tiers to improve recommendation relevance.')
        }

        if (profile.preferredLocations.length === 0) {
            gaps.push('Add preferred locations to improve recommendation relevance.')
        }

        if (gaps.length === 0) {
            gaps.push('Your profile has enough data for scoring across all MVP factors.')
        }

        return gaps
    }, [profile, role])

    return (
        <main className="app-page foryou-page">
            <section className="app-hero foryou-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />
                <div className="app-hero-content">
                    <p className="eyebrow">For You</p>
                    <h1>Personalized fit and priority insights.</h1>
                    <p className="lead-copy">
                        Ranked recommendation feed with weighted position, league, and location match percentages.
                    </p>
                </div>
            </section>

            <section className="app-section foryou-page-grid" aria-label="Recommendation modules">
                <article className="app-card">
                    <p className="card-kicker">Match Signals</p>
                    <h3>{role === 'player' ? 'Best fit listings' : 'Best fit players'}</h3>
                    <p>
                        {role === 'player'
                            ? `${playerRecommendations.length} ranked listings with top score ${topPlayerScore}%.`
                            : `${managerRecommendations.length} ranked applicants with top score ${topManagerScore}%.`}
                    </p>
                    <div className="empty-slot">
                        {isLoading
                            ? 'Loading match signals...'
                            : role === 'player'
                                ? `${listings.length} open listings evaluated.`
                                : `${applications.length} applications evaluated.`}
                    </div>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Priorities</p>
                    <h3>{role === 'player' ? 'Your profile gaps' : 'Your listing gaps'}</h3>
                    {role === 'player' ? (
                        <div className="listing-board">
                            {playerPriorities.map((priority) => (
                                <article className="listing-entry" key={priority}>
                                    <p>{priority}</p>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-slot">
                            Manager recommendation quality improves as applicants complete position, league tier, and location preferences.
                        </div>
                    )}
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Recommendations</p>
                    <h3>{role === 'player' ? 'Suggested teams and listings' : 'Suggested players and fit scores'}</h3>
                    {statusMessage && <p className="form-status error">{statusMessage}</p>}

                    {isLoading ? (
                        <div className="empty-slot">Loading recommendations...</div>
                    ) : role === 'player' ? (
                        <div className="listing-board">
                            {playerRecommendations.map((entry) => (
                                <article className="listing-entry" key={entry.listing.id}>
                                    <header className="listing-entry-header">
                                        <p className="listing-team">{entry.listing.teamName}</p>
                                        <p className="listing-applicants">Match {entry.score}%</p>
                                    </header>
                                    <h4>{entry.listing.position}</h4>
                                    <p>{entry.listing.description || 'No listing description provided.'}</p>
                                </article>
                            ))}

                            {playerRecommendations.length === 0 && <div className="empty-slot">No recommendations available yet.</div>}
                        </div>
                    ) : (
                        <div className="listing-board">
                            {managerRecommendations.map((entry) => (
                                <article className="listing-entry" key={entry.application.id}>
                                    <header className="listing-entry-header">
                                        <p className="listing-team">{entry.application.teamName}</p>
                                        <p className="listing-applicants">Fit {entry.score}%</p>
                                    </header>
                                    <h4>{entry.application.listingPosition}</h4>
                                    <p>{entry.application.message || 'No message provided.'}</p>
                                </article>
                            ))}

                            {managerRecommendations.length === 0 && <div className="empty-slot">No recommendations available yet.</div>}
                        </div>
                    )}
                </article>
            </section>

        </main>
    )
}

export default ForYouPage
