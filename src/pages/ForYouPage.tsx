import { useEffect, useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import type { UserRole } from '../services/auth'
import { getCurrentProfile } from '../services/profile'

const ForYouPage = () => {
    const [role, setRole] = useState<UserRole>('player')

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    useEffect(() => {
        const loadRole = async () => {
            const result = await getCurrentProfile()

            if (!result.ok || !result.profile) {
                return
            }

            setRole(result.profile.role)
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
                    <p>
                        {role === 'player'
                            ? 'Position, height, and team preferences scoring panel placeholder.'
                            : 'Roster needs and player profile scoring panel placeholder.'}
                    </p>
                    <div className="empty-slot">No match signals yet.</div>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Priorities</p>
                    <h3>{role === 'player' ? 'Your profile gaps' : 'Your listing gaps'}</h3>
                    <p>
                        {role === 'player'
                            ? 'Guidance to improve discoverability will be displayed here.'
                            : 'Guidance to improve listing completion will be displayed here.'}
                    </p>
                    <button className="primary-button" type="button" disabled>
                        Analyze (coming soon)
                    </button>
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Recommendations</p>
                    <h3>{role === 'player' ? 'Suggested teams and listings' : 'Suggested players and fit scores'}</h3>
                    <p>Container reserved for ranked recommendation cards from future matching logic.</p>
                    <div className="empty-slot">Recommendations will appear here.</div>
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Ready to manage your submissions?"
                linkLabel="Go to applications"
                linkTo="/applications"
            />
        </main>
    )
}

export default ForYouPage
