import { useState } from 'react'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'

type RoleView = 'player' | 'manager'

type MockListing = {
    id: string
    team: string
    position: string
    description: string
    applicants: number
}

const playerMockListings: MockListing[] = [
    {
        id: 'nova-mid-laner',
        team: 'Nova Horizon',
        position: 'Mid Laner',
        description:
            'Looking for a high-communication shot caller who can control tempo and rotate early for objective setups.',
        applicants: 26,
    },
    {
        id: 'iron-root-initiator',
        team: 'Iron Root',
        position: 'Initiator',
        description:
            'Need an aggressive engage specialist with strong VOD review habits and consistent evening scrim availability.',
        applicants: 14,
    },
    {
        id: 'coastline-flex',
        team: 'Coastline Collective',
        position: 'Flex Support',
        description:
            'Searching for a flexible support who can swap comps quickly and anchor teamfight communication under pressure.',
        applicants: 19,
    },
]

const managerMockListings: MockListing[] = [
    {
        id: 'wildfire-igl',
        team: 'Wildfire Academy',
        position: 'In-Game Leader',
        description:
            'Own draft prep, lead live adaptations, and collaborate with staff on weekly progression goals.',
        applicants: 33,
    },
    {
        id: 'vertex-analyst',
        team: 'Vertex Union',
        position: 'Performance Analyst',
        description:
            'Build match prep packets, identify repeat mistakes, and present concise improvement plans to players.',
        applicants: 12,
    },
    {
        id: 'summit-jungle',
        team: 'Summit Rift',
        position: 'Jungle',
        description:
            'Need a pathing-focused jungler who can coordinate lane pressure and objective conversions in structured play.',
        applicants: 21,
    },
]

const ListingsPage = () => {
    const [roleView, setRoleView] = useState<RoleView>('player')
    const listingData = roleView === 'player' ? playerMockListings : managerMockListings
    const totalApplicants = listingData.reduce((sum, listing) => sum + listing.applicants, 0)

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    return (
        <main className="app-page listings-page">
            <section className="app-hero listings-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Create account" ctaTo="/signup" />
                <div className="app-hero-content">
                    <p className="eyebrow">Listings</p>
                    <h1>Track openings by position and status.</h1>
                    <p className="lead-copy">
                        Mock listing previews are enabled so you can review card layout and hiring signal density before wiring
                        live data.
                    </p>
                </div>
            </section>

            <section className="app-section role-switcher-shell" aria-label="Role view switcher">
                <p className="section-label">Listings mode</p>
                <div className="role-switcher" role="group" aria-label="Select listings role">
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

            <section className="app-section listings-page-grid" aria-label="Listing modules">
                <article className="app-card">
                    <p className="card-kicker">Snapshot</p>
                    <h3>{roleView === 'player' ? 'Open opportunities' : 'Your active postings'}</h3>
                    <p>
                        {roleView === 'player'
                            ? 'Use this preview to evaluate readability of listing cards from a player perspective.'
                            : 'Use this preview to validate how your listings read when applicants are flowing in.'}
                    </p>
                    <div className="empty-slot">
                        <strong>{listingData.length}</strong> listings visible · <strong>{totalApplicants}</strong> total applicants
                    </div>
                </article>

                <article className="app-card">
                    <p className="card-kicker">Actions</p>
                    <h3>{roleView === 'player' ? 'Apply to listing' : 'Create listing'}</h3>
                    <p>
                        {roleView === 'player'
                            ? 'Applications are still mocked, but this reflects where users will enter the flow.'
                            : 'Creation and publish controls are staged next once the schema endpoints are connected.'}
                    </p>
                    <button className="primary-button" type="button" disabled>
                        Coming soon
                    </button>
                </article>

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Listing Board</p>
                    <h3>{roleView === 'player' ? 'Available opportunities' : 'Listings you manage'}</h3>
                    <p>
                        Each listing includes the team posting it, role title, short role brief, and applicant momentum.
                    </p>
                    <div className="listing-board">
                        {listingData.map((listing) => (
                            <article className="listing-entry" key={listing.id}>
                                <header className="listing-entry-header">
                                    <p className="listing-team">{listing.team}</p>
                                    <p className="listing-applicants">
                                        {listing.applicants} {listing.applicants === 1 ? 'applicant' : 'applicants'}
                                    </p>
                                </header>
                                <h4>{listing.position}</h4>
                                <p>{listing.description}</p>
                            </article>
                        ))}
                    </div>
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Need personalized matching?"
                linkLabel="Open For You"
                linkTo="/for-you"
            />
        </main>
    )
}

export default ListingsPage
