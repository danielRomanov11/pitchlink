import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { signOut } from '../services/auth'

type NavLinkItem = {
    label: string
    href: string
}

type SiteNavbarProps = {
    links: NavLinkItem[]
    ctaLabel: string
    ctaTo: string
}

const SiteNavbar = ({ links, ctaLabel, ctaTo }: SiteNavbarProps) => {
    const { isAuthenticated } = useAuth()
    const navigate = useNavigate()
    const [isSigningOut, setIsSigningOut] = useState(false)

    const handleSignOut = async () => {
        if (isSigningOut) {
            return
        }

        setIsSigningOut(true)
        const result = await signOut()
        setIsSigningOut(false)

        if (result.ok) {
            navigate('/login', { replace: true })
        }
    }

    return (
        <header className="topbar">
            <a href='./'><div className="brand-mark">Pitch Link</div></a>
            <nav className="main-nav" aria-label="Main navigation">
                {links.map((link) => (
                    <a key={link.href} href={link.href}>
                        {link.label}
                    </a>
                ))}
            </nav>
            {isAuthenticated ? (
                <button className="ghost-button" type="button" onClick={() => void handleSignOut()} disabled={isSigningOut}>
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </button>
            ) : (
                <Link className="ghost-button" to={ctaTo}>
                    {ctaLabel}
                </Link>
            )}
        </header>
    )
}

export default SiteNavbar
