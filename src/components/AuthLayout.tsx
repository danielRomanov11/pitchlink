import { Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'

type AuthLayoutProps = PropsWithChildren<{
    title: string
    subtitle: string
    footerText: string
    footerLinkLabel: string
    footerLinkTo: string
}>

const AuthLayout = ({
    title,
    subtitle,
    children,
}: AuthLayoutProps) => {
    return (
        <main className="auth-page">
            <section className="auth-shell" aria-label="Authentication form">
                <Link className="auth-brand" to="/" aria-label="Pitch Link home">
                    Pitch Link
                </Link>
                <p className="auth-kicker">Soccer Recruitment Network</p>
                <h1>{title}</h1>
                <p className="auth-subtitle">{subtitle}</p>
                {children}
            </section>
        </main>
    )
}

export default AuthLayout
