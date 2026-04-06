import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'

type RoleView = 'player' | 'manager'

const TeamsPage = () => {
    const [roleView, setRoleView] = useState<RoleView>('player')

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    return (
        <main className="app-page teams-page">
            <section className="app-hero teams-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Account" ctaTo="/profile" />
                <div className="app-hero-content">
                    <p className="eyebrow">Teams</p>
                    <h1>Find the right club environment.</h1>
                    <p className="lead-copy">
                        Browse teams by league, location, and recruiting activity. This page is scaffolded for
                        frontend structure only.
                    </p>
                </div>
            </section>

            <section className="app-section role-switcher-shell" aria-label="Role view switcher">
                <p className="section-label">Preview role interface</p>
                <div className="role-switcher" role="group" aria-label="Select role">
                    <button
                        className={`secondary-button role-switcher-button ${roleView === 'player' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setRoleView('player')}
                    >
                        Player View
                    </button>
                    <button
                        className={`secondary-button role-switcher-button ${roleView === 'manager' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setRoleView('manager')}
                    >
                        Manager View
                    </button>
                </div>
            </section>

            <section className="app-section teams-page-grid" aria-label="Teams modules">
                <article className="app-card">
                    <p className="card-kicker">Team Search</p>
                    <h3>{roleView === 'player' ? 'Discover Teams' : 'Monitor Similar Teams'}</h3>
                    <p>
                        {roleView === 'player'
                            ? 'Filter by league, location, and open positions to find teams that match your profile.'
                            : 'Compare nearby teams and track recruitment trends to position your club competitively.'}
                    </p>
                    <button className="primary-button" type="button" disabled>
                        Coming soon
                    </button>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Team Detail</p>
                    <h3>{roleView === 'player' ? 'Review Team Overview' : 'Manage Team Page'}</h3>
                    <p>
                        {roleView === 'player'
                            ? 'View team culture, location, and listing priorities before sending applications.'
                            : 'Edit your team identity, league details, and media links for player discovery.'}
                    </p>
                    <div className="empty-slot">No team selected yet.</div>
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Directory</p>
                    <h3>{roleView === 'player' ? 'Open Team Directory' : 'Your Managed Teams'}</h3>
                    <p>
                        Structured list area reserved for future Supabase-backed team results and pagination.
                    </p>
                    <div className="empty-slot">Team rows will appear here.</div>
                </article>
            </section>

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
