import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteNavbar from '../components/SiteNavbar'
import { getListingsForTeamId, type ListingRecord } from '../services/listing'
import { type UserRole } from '../services/auth'
import { getCurrentProfile } from '../services/profile'
import { getTeamById, type TeamRecord, updateTeam } from '../services/team'

const normalizeWebsiteUrl = (rawUrl: string): string | null => {
    const trimmedUrl = rawUrl.trim()

    if (!trimmedUrl) {
        return null
    }

    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`

    try {
        const parsedUrl = new URL(normalizedUrl)

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null
        }

        return parsedUrl.toString()
    } catch {
        return null
    }
}

const TeamProfilePage = () => {
    const { teamId = '' } = useParams<{ teamId: string }>()
    const [role, setRole] = useState<UserRole>('player')
    const [currentUserId, setCurrentUserId] = useState('')
    const [team, setTeam] = useState<TeamRecord | null>(null)
    const [teamNameInput, setTeamNameInput] = useState('')
    const [teamLeagueInput, setTeamLeagueInput] = useState('')
    const [teamLocationInput, setTeamLocationInput] = useState('')
    const [teamUrlInput, setTeamUrlInput] = useState('')
    const [listings, setListings] = useState<ListingRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditingTeam, setIsEditingTeam] = useState(false)
    const [isSavingTeam, setIsSavingTeam] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    useEffect(() => {
        const loadPage = async () => {
            setIsLoading(true)
            setStatusMessage(null)
            setStatusType(null)
            setIsEditingTeam(false)

            if (!teamId.trim()) {
                setStatusType('error')
                setStatusMessage('Invalid team id.')
                setTeam(null)
                setListings([])
                setTeamNameInput('')
                setTeamLeagueInput('')
                setTeamLocationInput('')
                setTeamUrlInput('')
                setIsLoading(false)
                return
            }

            const profileResult = await getCurrentProfile()

            if (profileResult.ok && profileResult.profile) {
                setRole(profileResult.profile.role)
                setCurrentUserId(profileResult.profile.userId)
            }

            const [teamResult, listingsResult] = await Promise.all([
                getTeamById(teamId),
                getListingsForTeamId(teamId),
            ])

            if (!teamResult.ok || !teamResult.team) {
                setStatusType('error')
                setStatusMessage(teamResult.message ?? 'Unable to load team profile.')
                setTeam(null)
                setListings([])
                setTeamNameInput('')
                setTeamLeagueInput('')
                setTeamLocationInput('')
                setTeamUrlInput('')
                setIsLoading(false)
                return
            }

            if (!listingsResult.ok) {
                setStatusType('error')
                setStatusMessage(listingsResult.message ?? 'Unable to load team listings.')
                setTeam(teamResult.team)
                setListings([])
                setTeamNameInput(teamResult.team.name)
                setTeamLeagueInput(teamResult.team.league)
                setTeamLocationInput(teamResult.team.location)
                setTeamUrlInput(teamResult.team.url)
                setIsLoading(false)
                return
            }

            setTeam(teamResult.team)
            setTeamNameInput(teamResult.team.name)
            setTeamLeagueInput(teamResult.team.league)
            setTeamLocationInput(teamResult.team.location)
            setTeamUrlInput(teamResult.team.url)
            setListings(listingsResult.listings ?? [])
            setIsLoading(false)
        }

        void loadPage()
    }, [teamId])

    const visibleListings = useMemo(() => {
        if (role === 'manager') {
            return listings
        }

        return listings.filter((listing) => listing.status === 'open')
    }, [role, listings])

    const teamWebsiteUrl = useMemo(() => normalizeWebsiteUrl(team?.url ?? ''), [team?.url])
    const canEditTeam = role === 'manager' && !!team && currentUserId.length > 0 && team.managerId === currentUserId

    const handleSaveTeam = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!team || !canEditTeam) {
            return
        }

        setStatusMessage(null)
        setStatusType(null)
        setIsSavingTeam(true)

        const result = await updateTeam({
            teamId: team.id,
            name: teamNameInput,
            league: teamLeagueInput,
            location: teamLocationInput,
            url: teamUrlInput,
        })

        setIsSavingTeam(false)

        if (!result.ok || !result.team) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to update team profile.')
            return
        }

        setTeam(result.team)
        setTeamNameInput(result.team.name)
        setTeamLeagueInput(result.team.league)
        setTeamLocationInput(result.team.location)
        setTeamUrlInput(result.team.url)
        setIsEditingTeam(false)
        setStatusType('success')
        setStatusMessage('Team profile updated successfully.')
    }

    return (
        <main className="app-page teams-page-simple team-profile-page">
            <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />

            <section className="app-section team-profile-shell" aria-label="Team profile">
                <div className="team-profile-layout">
                    <article className="app-card team-profile-header">
                        <Link className="text-link team-profile-back" to="/teams">
                            Back to teams directory
                        </Link>
                        <p className="card-kicker">Team profile</p>
                        <h2 className="team-profile-name">{isLoading ? 'Loading team...' : team?.name ?? 'Team not found'}</h2>
                        <p className="team-profile-meta">
                            {team
                                ? `${team.league} · ${team.location}`
                                : 'This team record is not available right now.'}
                        </p>

                        {teamWebsiteUrl ? (
                            <a className="text-link" href={teamWebsiteUrl} target="_blank" rel="noreferrer">
                                Visit team website
                            </a>
                        ) : (
                            <p className="auth-helper-text">No external team website listed.</p>
                        )}

                        {canEditTeam && !isEditingTeam && (
                            <button className="secondary-button" type="button" onClick={() => setIsEditingTeam(true)}>
                                Edit team profile
                            </button>
                        )}

                        {canEditTeam && isEditingTeam && (
                            <form className="auth-form" onSubmit={handleSaveTeam} noValidate>
                                <label htmlFor="team-edit-name">Team Name</label>
                                <input
                                    id="team-edit-name"
                                    name="name"
                                    type="text"
                                    value={teamNameInput}
                                    onChange={(event) => setTeamNameInput(event.target.value)}
                                    required
                                />

                                <label htmlFor="team-edit-league">League</label>
                                <input
                                    id="team-edit-league"
                                    name="league"
                                    type="text"
                                    value={teamLeagueInput}
                                    onChange={(event) => setTeamLeagueInput(event.target.value)}
                                    required
                                />

                                <label htmlFor="team-edit-location">Location</label>
                                <input
                                    id="team-edit-location"
                                    name="location"
                                    type="text"
                                    value={teamLocationInput}
                                    onChange={(event) => setTeamLocationInput(event.target.value)}
                                    required
                                />

                                <label htmlFor="team-edit-url">Team URL (optional)</label>
                                <input
                                    id="team-edit-url"
                                    name="url"
                                    type="url"
                                    value={teamUrlInput}
                                    onChange={(event) => setTeamUrlInput(event.target.value)}
                                />

                                <button className="primary-button" type="submit" disabled={isSavingTeam}>
                                    {isSavingTeam ? 'Saving...' : 'Save team profile'}
                                </button>

                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() => {
                                        if (!team) {
                                            return
                                        }

                                        setTeamNameInput(team.name)
                                        setTeamLeagueInput(team.league)
                                        setTeamLocationInput(team.location)
                                        setTeamUrlInput(team.url)
                                        setIsEditingTeam(false)
                                    }}
                                    disabled={isSavingTeam}
                                >
                                    Cancel
                                </button>
                            </form>
                        )}
                    </article>

                    <article className="app-card">
                        <p className="card-kicker">Listings</p>
                        <h3>{isLoading ? 'Loading listings...' : `${visibleListings.length} active listing records`}</h3>
                        <p>
                            {role === 'manager'
                                ? 'Review listings attached to this team and applicant momentum.'
                                : 'Open listings are shown for this team profile.'}
                        </p>

                        {isLoading ? (
                            <div className="empty-slot">Loading team details.</div>
                        ) : visibleListings.length === 0 ? (
                            <div className="empty-slot">No listings available right now.</div>
                        ) : (
                            <div className="listing-board">
                                {visibleListings.map((listing) => (
                                    <article className="listing-entry" key={listing.id}>
                                        <header className="listing-entry-header">
                                            <p className="listing-team">{listing.position}</p>
                                            <p className="listing-applicants">
                                                {listing.applicants} {listing.applicants === 1 ? 'applicant' : 'applicants'}
                                            </p>
                                        </header>
                                        <h4>Status: {listing.status}</h4>
                                        <p>{listing.description || 'No listing description provided yet.'}</p>
                                    </article>
                                ))}
                            </div>
                        )}
                    </article>
                </div>
            </section>

            {statusMessage && (
                <section className="app-section" aria-label="Team profile status">
                    <p className={`form-status ${statusType === 'error' ? 'error' : 'success'}`} role="status">
                        {statusMessage}
                    </p>
                </section>
            )}


        </main>
    )
}

export default TeamProfilePage
