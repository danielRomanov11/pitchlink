import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import { type UserRole } from '../services/auth'
import { getCurrentProfile } from '../services/profile'
import { createTeam, getTeamsForCurrentUser, type TeamRecord } from '../services/team'

const TEAMS_PER_PAGE = 6

const TeamsPage = () => {
    const [role, setRole] = useState<UserRole | null>(null)
    const [teams, setTeams] = useState<TeamRecord[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
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

            const profileResult = await getCurrentProfile()

            if (!profileResult.ok || !profileResult.profile) {
                setStatusType('error')
                setStatusMessage(profileResult.message ?? 'Unable to load profile.')
                setIsLoading(false)
                return
            }

            const currentRole = profileResult.profile.role
            setRole(currentRole)

            const teamResult = await getTeamsForCurrentUser(currentRole)

            if (!teamResult.ok) {
                setStatusType('error')
                setStatusMessage(teamResult.message ?? 'Unable to load teams.')
                setIsLoading(false)
                return
            }

            setTeams(teamResult.teams ?? [])
            setCurrentPage(1)
            setIsLoading(false)
        }

        void loadPage()
    }, [])

    const totalTeams = teams.length
    const totalPages = Math.max(1, Math.ceil(totalTeams / TEAMS_PER_PAGE))
    const safeCurrentPage = Math.min(currentPage, totalPages)
    const pageStart = (safeCurrentPage - 1) * TEAMS_PER_PAGE
    const paginatedTeams = teams.slice(pageStart, pageStart + TEAMS_PER_PAGE)
    const visibleStart = totalTeams === 0 ? 0 : pageStart + 1
    const visibleEnd = totalTeams === 0 ? 0 : Math.min(pageStart + TEAMS_PER_PAGE, totalTeams)

    const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (role !== 'manager') {
            return
        }

        setStatusMessage(null)
        setStatusType(null)
        setIsCreating(true)

        const formData = new FormData(event.currentTarget)
        const name = String(formData.get('name') ?? '')
        const league = String(formData.get('league') ?? '')
        const location = String(formData.get('location') ?? '')
        const url = String(formData.get('url') ?? '')

        const result = await createTeam({ name, league, location, url })

        setIsCreating(false)

        if (!result.ok || !result.team) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to create team.')
            return
        }

        setTeams((previous) => [result.team as TeamRecord, ...previous])
        setCurrentPage(1)
        setStatusType('success')
        setStatusMessage('Team created successfully.')
        event.currentTarget.reset()
    }

    return (
        <main className="app-page teams-page-simple">
            <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />

            <section className="app-section teams-page-shell" aria-label="Teams page content">
                <div className="teams-page-content">
                    <article className="app-card teams-directory-panel">
                        <p className="card-kicker">Teams</p>
                        <h3>{role === 'manager' ? 'Your team directory' : 'Open team directory'}</h3>
                        <p>
                            {isLoading
                                ? 'Loading team records.'
                                : role === 'manager'
                                    ? 'Manage your team records and keep listing details up to date.'
                                    : 'Browse clubs by league and location, then open listings to apply.'}
                        </p>

                        {teams.length === 0 ? (
                            <div className="empty-slot">No teams found yet.</div>
                        ) : (
                            <>
                                <p className="teams-directory-helper">Tap or click any team card to open its profile.</p>

                                <div className="listing-board">
                                    {paginatedTeams.map((team) => (
                                        <Link
                                            className="listing-entry listing-entry-link"
                                            to={`/teams/${team.id}`}
                                            key={team.id}
                                            aria-label={`Open ${team.name} profile`}
                                        >
                                            <header className="listing-entry-header">
                                                <p className="listing-team">{team.name}</p>
                                                <p className="listing-applicants">{team.league}</p>
                                            </header>
                                            <h4>{team.location}</h4>
                                            <p>{team.url ? team.url : 'No team website listed.'}</p>
                                            <p className="listing-entry-link-hint">Open team profile</p>
                                        </Link>
                                    ))}
                                </div>

                                <div className="teams-pagination" aria-label="Teams pagination">
                                    <p className="teams-pagination-copy">
                                        Showing {visibleStart}-{visibleEnd} of {totalTeams}
                                    </p>
                                    <div className="teams-pagination-controls">
                                        <button
                                            className="secondary-button"
                                            type="button"
                                            onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                                            disabled={safeCurrentPage === 1}
                                        >
                                            Previous
                                        </button>
                                        <span className="teams-pagination-page">Page {safeCurrentPage} of {totalPages}</span>
                                        <button
                                            className="secondary-button"
                                            type="button"
                                            onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                                            disabled={safeCurrentPage === totalPages}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </article>

                    <aside className="app-card teams-actions-panel">
                        <p className="card-kicker">Actions</p>
                        <h3>{role === 'manager' ? 'Create team' : 'Next step'}</h3>
                        {role === 'manager' ? (
                            <form className="auth-form" onSubmit={handleCreateTeam} noValidate>
                                <label htmlFor="team-name">Team Name</label>
                                <input id="team-name" name="name" type="text" required />

                                <label htmlFor="team-league">League</label>
                                <input id="team-league" name="league" type="text" required />

                                <label htmlFor="team-location">Location</label>
                                <input id="team-location" name="location" type="text" required />

                                <label htmlFor="team-url">Team URL (optional)</label>
                                <input id="team-url" name="url" type="url" />

                                <button className="primary-button" type="submit" disabled={isCreating}>
                                    {isCreating ? 'Creating team...' : 'Create team'}
                                </button>
                            </form>
                        ) : (
                            <>
                                <p>Use Listings to apply to teams that are actively recruiting your position.</p>
                                <a className="primary-button" href="/listings">
                                    Browse listings
                                </a>
                            </>
                        )}
                    </aside>
                </div>
            </section>

            {statusMessage && (
                <section className="app-section" aria-label="Teams status">
                    <p className={`form-status ${statusType === 'error' ? 'error' : 'success'}`} role="status">
                        {statusMessage}
                    </p>
                </section>
            )}

            <SiteFooter
                className="page-footer"
                text="Need a full manager or player setup?"
                linkLabel="Open profile"
                linkTo="/profile"
            />
        </main>
    )
}

export default TeamsPage
