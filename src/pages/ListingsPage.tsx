import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import SiteNavbar from '../components/SiteNavbar'
import {
    createApplication,
    getApplicationsForCurrentUser,
    type ApplicationStatus,
} from '../services/application'
import type { UserRole } from '../services/auth'
import {
    createListing,
    getListingsForCurrentUser,
    updateListingPreference,
    updateListingStatus,
    type ListingRecord,
    type ListingStatus,
} from '../services/listing'
import { LEAGUE_TIER_OPTIONS, calculatePlayerListingMatchScore, normalizeLeagueTierValues } from '../services/matching'
import { getCurrentProfile, type CurrentProfile } from '../services/profile'
import { getTeamsForCurrentUser, type TeamRecord } from '../services/team'

const listingPositionOptions = [
    'Goalkeeper',
    'Center Back',
    'Left Back',
    'Right Back',
    'Defensive Midfielder',
    'Central Midfielder',
    'Attacking Midfielder',
    'Left Midfielder',
    'Right Midfielder',
    'Left Winger',
    'Right Winger',
    'Striker',
]

const parseTextPreferenceInput = (value: string) => {
    const dedupedValues = new Set<string>()

    for (const token of value.split(',')) {
        const normalizedToken = token.trim()

        if (!normalizedToken) {
            continue
        }

        dedupedValues.add(normalizedToken)
    }

    return [...dedupedValues]
}

const parseLeagueTierInput = (value: string) => {
    return normalizeLeagueTierValues(
        value
            .split(',')
            .map((token) => token.trim())
            .filter((token) => token.length > 0),
    )
}

type ListingPreferenceDraft = {
    preferredPlayerLeagues: string
    preferredPlayerLocations: string
}

const ListingsPage = () => {
    const [role, setRole] = useState<UserRole | null>(null)
    const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null)
    const [teams, setTeams] = useState<TeamRecord[]>([])
    const [listings, setListings] = useState<ListingRecord[]>([])
    const [applicationMessages, setApplicationMessages] = useState<Record<string, string>>({})
    const [applicationStatuses, setApplicationStatuses] = useState<Record<string, ApplicationStatus>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isCreatingListing, setIsCreatingListing] = useState(false)
    const [activeApplyListingId, setActiveApplyListingId] = useState<string | null>(null)
    const [activeListingStatusId, setActiveListingStatusId] = useState<string | null>(null)
    const [activeListingPreferenceId, setActiveListingPreferenceId] = useState<string | null>(null)
    const [listingPreferenceDrafts, setListingPreferenceDrafts] = useState<Record<string, ListingPreferenceDraft>>({})
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    const totalApplicants = listings.reduce((sum, listing) => sum + listing.applicants, 0)

    const listingMatchScores = useMemo(() => {
        if (role !== 'player' || !currentProfile) {
            return {} as Record<string, number>
        }

        return listings.reduce<Record<string, number>>((scoresByListing, listing) => {
            const score = calculatePlayerListingMatchScore({
                playerPosition: currentProfile.position,
                playerPreferredLeagues: currentProfile.preferredLeagues,
                playerPreferredLocations: currentProfile.preferredLocations,
                listingPosition: listing.position,
                listingPreferredPlayerLeagues: listing.preferredPlayerLeagues,
                listingPreferredPlayerLocations: listing.preferredPlayerLocations,
                teamLeague: listing.teamLeague,
                teamLocation: listing.teamLocation,
            }).totalScore

            scoresByListing[listing.id] = score
            return scoresByListing
        }, {})
    }, [currentProfile, listings, role])

    const displayListings = useMemo(() => {
        if (role !== 'player') {
            return listings
        }

        return [...listings].sort((leftListing, rightListing) => {
            const leftScore = listingMatchScores[leftListing.id] ?? 0
            const rightScore = listingMatchScores[rightListing.id] ?? 0

            if (rightScore === leftScore) {
                return leftListing.position.localeCompare(rightListing.position)
            }

            return rightScore - leftScore
        })
    }, [listings, listingMatchScores, role])

    useEffect(() => {
        const loadPage = async () => {
            setIsLoading(true)
            setStatusMessage(null)
            setStatusType(null)

            const profileResult = await getCurrentProfile()

            if (!profileResult.ok || !profileResult.profile) {
                setStatusType('error')
                setStatusMessage(profileResult.message ?? 'Unable to load profile.')
                setIsLoading(false)
                return
            }

            const currentRole = profileResult.profile.role
            setRole(currentRole)
            setCurrentProfile(profileResult.profile)

            const listingResult = await getListingsForCurrentUser(currentRole)

            if (!listingResult.ok) {
                setStatusType('error')
                setStatusMessage(listingResult.message ?? 'Unable to load listings.')
                setIsLoading(false)
                return
            }

            setListings(listingResult.listings ?? [])
            setApplicationMessages({})
            setApplicationStatuses({})

            if (currentRole === 'player') {
                const applicationResult = await getApplicationsForCurrentUser('player')

                if (!applicationResult.ok) {
                    setStatusType('error')
                    setStatusMessage(applicationResult.message ?? 'Unable to load your application statuses.')
                    setIsLoading(false)
                    return
                }

                const statusesByListing = (applicationResult.applications ?? []).reduce<Record<string, ApplicationStatus>>(
                    (accumulator, application) => {
                        accumulator[application.listingId] = application.status
                        return accumulator
                    },
                    {},
                )

                setApplicationStatuses(statusesByListing)
            }

            if (currentRole === 'manager') {
                const teamResult = await getTeamsForCurrentUser('manager')

                if (!teamResult.ok) {
                    setStatusType('error')
                    setStatusMessage(teamResult.message ?? 'Unable to load your teams.')
                    setIsLoading(false)
                    return
                }

                setTeams(teamResult.teams ?? [])
            }

            setIsLoading(false)
        }

        void loadPage()
    }, [])

    const getListingPreferenceDraft = (listing: ListingRecord): ListingPreferenceDraft => {
        return listingPreferenceDrafts[listing.id] ?? {
            preferredPlayerLeagues: listing.preferredPlayerLeagues.join(', '),
            preferredPlayerLocations: listing.preferredPlayerLocations.join(', '),
        }
    }

    const handleListingPreferenceFieldChange = (
        listingId: string,
        field: keyof ListingPreferenceDraft,
        value: string,
    ) => {
        setListingPreferenceDrafts((previousDrafts) => ({
            ...previousDrafts,
            [listingId]: {
                preferredPlayerLeagues:
                    previousDrafts[listingId]?.preferredPlayerLeagues
                    ?? listings.find((listing) => listing.id === listingId)?.preferredPlayerLeagues.join(', ')
                    ?? '',
                preferredPlayerLocations:
                    previousDrafts[listingId]?.preferredPlayerLocations
                    ?? listings.find((listing) => listing.id === listingId)?.preferredPlayerLocations.join(', ')
                    ?? '',
                [field]: value,
            },
        }))
    }

    const handleListingCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (role !== 'manager') {
            return
        }

        setStatusMessage(null)
        setStatusType(null)
        setIsCreatingListing(true)

        const formData = new FormData(event.currentTarget)
        const teamId = String(formData.get('teamId') ?? '')
        const position = String(formData.get('position') ?? '')
        const description = String(formData.get('description') ?? '')
        const preferredPlayerLeagues = parseLeagueTierInput(String(formData.get('preferredPlayerLeagues') ?? ''))
        const preferredPlayerLocations = parseTextPreferenceInput(String(formData.get('preferredPlayerLocations') ?? ''))

        const result = await createListing({
            teamId,
            position,
            description,
            preferredPlayerLeagues,
            preferredPlayerLocations,
        })

        setIsCreatingListing(false)

        if (!result.ok || !result.listing) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to create listing.')
            return
        }

        setListings((previous) => [result.listing as ListingRecord, ...previous])
        setStatusType('success')
        setStatusMessage('Listing created successfully.')
        event.currentTarget.reset()
    }

    const handleApply = async (listing: ListingRecord) => {
        if (role !== 'player') {
            return
        }

        if (applicationStatuses[listing.id]) {
            setStatusType('error')
            setStatusMessage('You have already applied to this listing.')
            return
        }

        setStatusMessage(null)
        setStatusType(null)
        setActiveApplyListingId(listing.id)

        const result = await createApplication({
            teamId: listing.teamId,
            listingId: listing.id,
            message: applicationMessages[listing.id],
        })

        setActiveApplyListingId(null)

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to submit application.')
            return
        }

        setStatusType('success')
        setStatusMessage('Application submitted successfully.')
        setApplicationStatuses((previous) => ({
            ...previous,
            [listing.id]: 'pending',
        }))
        setApplicationMessages((previous) => ({
            ...previous,
            [listing.id]: '',
        }))
        setListings((previous) =>
            previous.map((previousListing) => {
                if (previousListing.id !== listing.id) {
                    return previousListing
                }

                return {
                    ...previousListing,
                    applicants: previousListing.applicants + 1,
                }
            }),
        )
    }

    const handleUpdateListingStatus = async (listing: ListingRecord, status: ListingStatus) => {
        if (role !== 'manager' || listing.status === status) {
            return
        }

        setStatusMessage(null)
        setStatusType(null)
        setActiveListingStatusId(listing.id)

        const result = await updateListingStatus(listing.id, status)

        setActiveListingStatusId(null)

        if (!result.ok || !result.listing) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to update listing status.')
            return
        }

        setListings((previous) =>
            previous.map((previousListing) => {
                if (previousListing.id !== listing.id) {
                    return previousListing
                }

                return result.listing as ListingRecord
            }),
        )

        setStatusType('success')
        setStatusMessage('Listing status updated.')
    }

    const handleUpdateListingPreference = async (listing: ListingRecord) => {
        if (role !== 'manager') {
            return
        }

        const draft = getListingPreferenceDraft(listing)

        const normalizedPreferredPlayerLeagues = parseLeagueTierInput(draft.preferredPlayerLeagues)
        const normalizedPreferredPlayerLocations = parseTextPreferenceInput(draft.preferredPlayerLocations)

        setStatusMessage(null)
        setStatusType(null)
        setActiveListingPreferenceId(listing.id)

        const result = await updateListingPreference({
            listingId: listing.id,
            preferredPlayerLeagues: normalizedPreferredPlayerLeagues,
            preferredPlayerLocations: normalizedPreferredPlayerLocations,
        })

        setActiveListingPreferenceId(null)

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to update listing preferences.')
            return
        }

        setListings((previousListings) =>
            previousListings.map((previousListing) => {
                if (previousListing.id !== listing.id) {
                    return previousListing
                }

                return {
                    ...previousListing,
                    preferredPlayerLeagues: normalizedPreferredPlayerLeagues,
                    preferredPlayerLocations: normalizedPreferredPlayerLocations,
                }
            }),
        )

        setListingPreferenceDrafts((previousDrafts) => ({
            ...previousDrafts,
            [listing.id]: {
                preferredPlayerLeagues: normalizedPreferredPlayerLeagues.join(', '),
                preferredPlayerLocations: normalizedPreferredPlayerLocations.join(', '),
            },
        }))

        setStatusType('success')
        setStatusMessage('Listing preferences updated.')
    }

    return (
        <main className="app-page listings-page">
            <section className="app-hero listings-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />
                <div className="app-hero-content">
                    <p className="eyebrow">Listings</p>
                    <h1>Track openings by position and status.</h1>
                    <p className="lead-copy">
                        {role === 'manager'
                            ? 'Create listings tied to your teams and manage recruiting visibility.'
                            : 'Browse open listings and apply to roles that match your profile.'}
                    </p>
                </div>
            </section>

            <section className="app-section listings-page-grid" aria-label="Listing modules">
                <article className="app-card">
                    <p className="card-kicker">Snapshot</p>
                    <h3>{role === 'manager' ? 'Your active postings' : 'Open opportunities'}</h3>
                    <p>
                        {isLoading
                            ? 'Loading listings from the database.'
                            : role === 'manager'
                                ? 'Review listing volume and applicant momentum.'
                                : 'Scan open opportunities and submit targeted applications.'}
                    </p>
                    <div className="empty-slot">
                        <strong>{listings.length}</strong> listings visible · <strong>{totalApplicants}</strong> total applicants
                    </div>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Actions</p>
                    <h3>{role === 'manager' ? 'Create listing' : 'Application flow'}</h3>
                    {role === 'manager' ? (
                        teams.length === 0 ? (
                            <p>Create at least one team first before posting listings.</p>
                        ) : (
                            <form className="auth-form" onSubmit={handleListingCreate} noValidate>
                                <label htmlFor="listing-team">Team</label>
                                <select id="listing-team" name="teamId" required>
                                    <option value="">Select a team</option>
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </select>

                                <label htmlFor="listing-position">Position</label>
                                <select id="listing-position" name="position" required>
                                    <option value="">Select one position</option>
                                    {listingPositionOptions.map((positionOption) => (
                                        <option key={positionOption} value={positionOption}>
                                            {positionOption}
                                        </option>
                                    ))}
                                </select>
                                <p className="auth-helper-text">Choose one position per listing.</p>

                                <label htmlFor="listing-description">Description</label>
                                <textarea id="listing-description" name="description" rows={3} />

                                <label htmlFor="listing-preferred-leagues">Preferred player league tiers (optional)</label>
                                <input
                                    id="listing-preferred-leagues"
                                    name="preferredPlayerLeagues"
                                    type="text"
                                    placeholder="SemiPro, Amateur"
                                />
                                <p className="auth-helper-text">Available tiers: {LEAGUE_TIER_OPTIONS.join(', ')}</p>

                                <label htmlFor="listing-preferred-locations">Preferred player locations (optional)</label>
                                <input
                                    id="listing-preferred-locations"
                                    name="preferredPlayerLocations"
                                    type="text"
                                    placeholder="Austin, Dallas"
                                />

                                <button className="primary-button" type="submit" disabled={isCreatingListing}>
                                    {isCreatingListing ? 'Creating listing...' : 'Create listing'}
                                </button>
                            </form>
                        )
                    ) : (
                        <p>Apply directly from a listing card, then track status from the same place.</p>
                    )}
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Listing Board</p>
                    <h3>{role === 'manager' ? 'Listings you manage' : 'Available opportunities'}</h3>
                    <p>
                        Each listing includes the team posting it, role title, short role brief, and applicant momentum.
                    </p>
                    <div className="listing-board">
                        {displayListings.map((listing) => (
                            <article className="listing-entry" key={listing.id}>
                                <header className="listing-entry-header">
                                    <p className="listing-team">{listing.teamName}</p>
                                    <p className="listing-applicants">
                                        {listing.applicants} {listing.applicants === 1 ? 'applicant' : 'applicants'}
                                    </p>
                                </header>
                                <h4>{listing.position}</h4>
                                <p className={`status-chip ${listing.status}`}>Listing {listing.status}</p>
                                {role === 'player' && <p className="status-chip">Match {listingMatchScores[listing.id] ?? 0}%</p>}
                                <p>{listing.description}</p>

                                {role === 'player' && (
                                    applicationStatuses[listing.id] ? (
                                        <p className={`status-chip ${applicationStatuses[listing.id]}`}>
                                            Application {applicationStatuses[listing.id]}
                                        </p>
                                    ) : (
                                        <>
                                            <label htmlFor={`listing-message-${listing.id}`}>Message (optional)</label>
                                            <textarea
                                                id={`listing-message-${listing.id}`}
                                                rows={2}
                                                value={applicationMessages[listing.id] ?? ''}
                                                onChange={(event) =>
                                                    setApplicationMessages((previous) => ({
                                                        ...previous,
                                                        [listing.id]: event.target.value,
                                                    }))
                                                }
                                                placeholder="Share a quick note with the manager."
                                            />
                                            <button
                                                className="secondary-button"
                                                type="button"
                                                onClick={() => void handleApply(listing)}
                                                disabled={activeApplyListingId === listing.id}
                                            >
                                                {activeApplyListingId === listing.id ? 'Submitting...' : 'Apply'}
                                            </button>
                                        </>
                                    )
                                )}

                                {role === 'manager' && (
                                    <>
                                        <div className="role-switcher" role="group" aria-label="Edit listing status">
                                            <button
                                                className={`secondary-button role-switcher-button ${listing.status === 'open' ? 'active' : ''}`}
                                                type="button"
                                                onClick={() => void handleUpdateListingStatus(listing, 'open')}
                                                disabled={activeListingStatusId === listing.id}
                                            >
                                                Open
                                            </button>
                                            <button
                                                className={`secondary-button role-switcher-button ${listing.status === 'closed' ? 'active' : ''}`}
                                                type="button"
                                                onClick={() => void handleUpdateListingStatus(listing, 'closed')}
                                                disabled={activeListingStatusId === listing.id}
                                            >
                                                Closed
                                            </button>
                                        </div>

                                        <label htmlFor={`listing-preferred-leagues-${listing.id}`}>Preferred player league tiers</label>
                                        <input
                                            id={`listing-preferred-leagues-${listing.id}`}
                                            type="text"
                                            value={getListingPreferenceDraft(listing).preferredPlayerLeagues}
                                            onChange={(event) =>
                                                handleListingPreferenceFieldChange(
                                                    listing.id,
                                                    'preferredPlayerLeagues',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="SemiPro, Amateur"
                                        />
                                        <p className="auth-helper-text">Available tiers: {LEAGUE_TIER_OPTIONS.join(', ')}</p>

                                        <label htmlFor={`listing-preferred-locations-${listing.id}`}>Preferred player locations</label>
                                        <input
                                            id={`listing-preferred-locations-${listing.id}`}
                                            type="text"
                                            value={getListingPreferenceDraft(listing).preferredPlayerLocations}
                                            onChange={(event) =>
                                                handleListingPreferenceFieldChange(
                                                    listing.id,
                                                    'preferredPlayerLocations',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Austin, Dallas"
                                        />

                                        <button
                                            className="secondary-button"
                                            type="button"
                                            onClick={() => void handleUpdateListingPreference(listing)}
                                            disabled={activeListingPreferenceId === listing.id}
                                        >
                                            {activeListingPreferenceId === listing.id ? 'Saving preferences...' : 'Save preferences'}
                                        </button>
                                    </>
                                )}
                            </article>
                        ))}

                        {!isLoading && listings.length === 0 && <div className="empty-slot">No listings found.</div>}
                    </div>
                </article>
            </section>

            {statusMessage && (
                <section className="app-section" aria-label="Listings status">
                    <p className={`form-status ${statusType === 'error' ? 'error' : 'success'}`} role="status">
                        {statusMessage}
                    </p>
                </section>
            )}

        </main>
    )
}

export default ListingsPage
