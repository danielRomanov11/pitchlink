import { Link } from 'react-router-dom'

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
    return (
        <header className="topbar">
            <div className="brand-mark">Pitch Link</div>
            <nav className="main-nav" aria-label="Main navigation">
                {links.map((link) => (
                    <a key={link.href} href={link.href}>
                        {link.label}
                    </a>
                ))}
            </nav>
            <Link className="ghost-button" to={ctaTo}>
                {ctaLabel}
            </Link>
        </header>
    )
}

export default SiteNavbar
