import { Link } from 'react-router-dom'
import { ArrowRight, Search, ShieldCheck, Target, Zap } from 'lucide-react'
import SiteNavbar from '../components/SiteNavbar'

const HomePage = () => {
    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    return (
        <>
            <section className="hero" id="platform">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />

                <div className="hero-content">
                    <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={14} /> Soccer Recruitment Network
                    </p>
                    <h1>Connect with teams that match your game.</h1>
                    <p className="lead-copy">
                        Pitch Link helps players and managers discover the right fit through team listings,
                        applications, and role-based recruitment insights.
                    </p>
                    <div className="hero-actions">
                        <Link className="primary-button" to="/signup" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Get Started <ArrowRight size={18} />
                        </Link>
                        <Link className="secondary-button" to="/listings" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Explore Listings <Search size={18} />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="bento-grid" id="roles" style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
                <article className="bento-card wide">
                    <div style={{ color: 'var(--accent)', marginBottom: '12px' }}><ShieldCheck size={32} /></div>
                    <p className="card-kicker">For Players</p>
                    <h3>Build your profile and apply with confidence.</h3>
                    <p style={{ color: 'var(--text-soft)', marginTop: '8px' }}>
                        Add your position, height, highlights URL, and a short bio to quickly apply for open
                        team listings.
                    </p>
                </article>
                <article className="bento-card">
                    <div style={{ color: 'var(--accent)', marginBottom: '12px' }}><Search size={32} /></div>
                    <p className="card-kicker">For Managers</p>
                    <h3>Publish listings and manage incoming applications.</h3>
                    <p style={{ color: 'var(--text-soft)', marginTop: '8px' }}>
                        Create team recruitment listings, review player submissions, and accept or decline
                        applications with clear status tracking.
                    </p>
                </article>
                <article className="bento-card wide" id="matching">
                    <div style={{ color: 'var(--accent)', marginBottom: '12px' }}><Target size={32} /></div>
                    <p className="card-kicker">Advanced Matching</p>
                    <h3>Use match percentages to find better team-player fit.</h3>
                    <p style={{ color: 'var(--text-soft)', marginTop: '8px' }}>
                        Compare player attributes with listing needs and surface similarity scores that support
                        faster, smarter recruitment decisions.
                    </p>
                </article>
            </section>
        </>
    )
}

export default HomePage
