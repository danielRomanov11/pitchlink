import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'

type RoleView = 'player' | 'manager'

const ApplicationsPage = () => {
    const [roleView, setRoleView] = useState<RoleView>('player')

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    return (
        <main className="app-page applications-page">
            <section className="app-hero applications-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Create account" ctaTo="/signup" />
                <div className="app-hero-content">
                    <p className="eyebrow">Applications</p>
                    <h1>Track statuses and decision flow.</h1>
                    <p className="lead-copy">
                        Application lifecycle UI scaffold for both players and managers with status-based sections.
                    </p>
                </div>
            </section>

            <section className="app-section role-switcher-shell" aria-label="Role view switcher">
                <p className="section-label">Application mode</p>
                <div className="role-switcher" role="group" aria-label="Select application role">
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

            <section className="app-section applications-page-grid" aria-label="Application status modules">
                <article className="app-card">
                    <p className="card-kicker">Pending</p>
                    <h3>{roleView === 'player' ? 'Awaiting team response' : 'Awaiting your review'}</h3>
                    <div className="status-chip pending">Pending</div>
                    <div className="empty-slot">No pending applications yet.</div>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Accepted</p>
                    <h3>{roleView === 'player' ? 'Successful applications' : 'Accepted players'}</h3>
                    <div className="status-chip accepted">Accepted</div>
                    <div className="empty-slot">No accepted applications yet.</div>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Declined</p>
                    <h3>{roleView === 'player' ? 'Declined submissions' : 'Declined candidates'}</h3>
                    <div className="status-chip declined">Declined</div>
                    <div className="empty-slot">No declined applications yet.</div>
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Messages</p>
                    <h3>{roleView === 'player' ? 'Application notes to teams' : 'Decision notes to players'}</h3>
                    <p>Message thread container reserved for future application communication records.</p>
                    <button className="primary-button" type="button" disabled>
                        Message center (coming soon)
                    </button>
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Want to revisit opportunities?"
                linkLabel="Browse listings"
                linkTo="/listings"
            />
        </main>
    )
}

export default ApplicationsPage
