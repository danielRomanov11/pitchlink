import { Link } from 'react-router-dom'

type SiteFooterProps = {
    text: string
    linkLabel: string
    linkTo: string
    className?: string
}

const SiteFooter = ({ text, linkLabel, linkTo, className }: SiteFooterProps) => {
    const footerClassName = className ? `site-footer ${className}` : 'site-footer'

    return (
        <footer className={footerClassName}>
            {text} <Link to={linkTo}>{linkLabel}</Link>
        </footer>
    )
}

export default SiteFooter
