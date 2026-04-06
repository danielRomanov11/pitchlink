import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import { type UserRole } from '../services/auth'
import { getCurrentProfile } from '../services/profile'
import { createTeam, getTeamsForCurrentUser, type TeamRecord } from '../services/team'

const TeamsPage = () => {
    const [role, setRole] = useState<UserRole | null>(null)
    const [teams, setTeams] = useState<TeamRecord[]>([])
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
            setIsLoading(false)
        }

        void loadPage()
    }, [])

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
        setStatusType('success')
        setStatusMessage('Team created successfully.')
        event.currentTarget.reset()
    }

    return (
        <main className="app-page teams-page">
            <section className="app-hero teams-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />
                <div className="app-hero-content">
                    <p className="eyebrow">Teams</p>
                    <h1>{role === 'manager' ? 'Manage your clubs and recruiting footprint.' : 'Find the right club environment.'}</h1>
                    <p className="lead-copy">
                        {role === 'manager'
                            ? 'Create and maintain your team records before publishing listings.'
                            : 'Browse active teams by league and location, then apply through open listings.'}
                    </p>
                </div>
            </section>

            <section className="app-section teams-page-grid" aria-label="Teams modules">
                <article className="app-card">
                    <p className="card-kicker">Snapshot</p>
                    <h3>{isLoading ? 'Loading teams' : role === 'manager' ? 'Your managed teams' : 'Available teams'}</h3>
                    <p>
                        {isLoading
                            ? 'Fetching your latest team data.'
                            : role === 'manager'
                                ? 'These are the teams you can attach listings to.'
                                : 'Browse current team records and jump to open listings.'}
                    </p>
                    <div className="empty-slot">
                        <strong>{teams.length}</strong> {teams.length === 1 ? 'team' : 'teams'} visible
                    </div>
                </article>

                <article className="app-card">
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
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Directory</p>
                    <h3>{role === 'manager' ? 'Your team directory' : 'Open team directory'}</h3>
                    <p>Each entry includes team name, league, location, and quick access to listings.</p>
                    {teams.length === 0 ? (
                        <div className="empty-slot">No teams found yet.</div>
                    ) : (
                        <div className="listing-board">
                            {teams.map((team) => (
                                <article className="listing-entry" key={team.id}>
                                    <header className="listing-entry-header">
                                        <p className="listing-team">{team.name}</p>
                                        <p className="listing-applicants">{team.league}</p>
                                    </header>
                                    <h4>{team.location}</h4>
                                    <p>{team.url ? team.url : 'No URL provided yet.'}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </article>
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
