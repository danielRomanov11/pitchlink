import { Link } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'

const HomePage = () => {
    const navLinks = [
        { label: 'For You', href: '#forYou' },
        { label: 'Teams', href: '#matching' },
        { label: 'Listings', href: '#roles' },
    ]

    return (
        <>
            <section className="hero" id="platform">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />

                <div className="hero-content">
                    <p className="eyebrow">Soccer Recruitment Network</p>
                    <h1>Connect with teams that match your game.</h1>
                    <p className="lead-copy">
                        Pitch Link helps players and managers discover the right fit through team listings,
                        applications, and role-based recruitment insights.
                    </p>
                    <div className="hero-actions">
                        <Link className="primary-button" to="/signup">
                            Get Started
                        </Link>
                        <button className="secondary-button" type="button">
                            Create Team Listing
                        </button>
                    </div>
                </div>
            </section>

            <section className="roles" id="roles">
                <article className="role-card">
                    <p className="card-kicker">For Players</p>
                    <h3>Build your profile and apply with confidence.</h3>
                    <p>
                        Add your position, height, highlights URL, and a short bio to quickly apply for open
                        team listings.
                    </p>
                </article>
                <article className="role-card">
                    <p className="card-kicker">For Managers</p>
                    <h3>Publish listings and manage incoming applications.</h3>
                    <p>
                        Create team recruitment listings, review player submissions, and accept or decline
                        applications with clear status tracking.
                    </p>
                </article>
                <article className="role-card" id="matching">
                    <p className="card-kicker">Advanced Matching</p>
                    <h3>Use match percentages to find better team-player fit.</h3>
                    <p>
                        Compare player attributes with listing needs and surface similarity scores that support
                        faster, smarter recruitment decisions.
                    </p>
                </article>
            </section>

            <SiteFooter
                className="page-footer"
                text="Ready to get recruited on Pitch Link?"
                linkLabel="Create your account"
                linkTo="/signup"
            />
        </>
    )
}

export default HomePage
