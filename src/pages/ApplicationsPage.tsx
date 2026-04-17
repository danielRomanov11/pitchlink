import { useEffect, useMemo, useState } from 'react'
import SiteNavbar from '../components/SiteNavbar'
import {
    getApplicationsForCurrentUser,
    updateApplicationStatus,
    type ApplicationRecord,
    type ApplicationStatus,
} from '../services/application'
import type { UserRole } from '../services/auth'
import { getCurrentProfile } from '../services/profile'

const ApplicationsPage = () => {
    const [role, setRole] = useState<UserRole | null>(null)
    const [applications, setApplications] = useState<ApplicationRecord[]>([])
    const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    useEffect(() => {
        const loadPage = async () => {
            setIsLoading(true)
            setStatusMessage(null)
            setStatusType(null)

            const profileResult = await getCurrentProfile()

            if (!profileResult.ok || !profileResult.profile) {
                setStatusType('error')
                setStatusMessage(profileResult.message ?? 'Unable to load profile.')
                setIsLoading(false)
                return
            }

            const currentRole = profileResult.profile.role
            setRole(currentRole)

            const applicationResult = await getApplicationsForCurrentUser(currentRole)

            if (!applicationResult.ok) {
                setStatusType('error')
                setStatusMessage(applicationResult.message ?? 'Unable to load applications.')
                setIsLoading(false)
                return
            }

            setApplications(applicationResult.applications ?? [])
            setIsLoading(false)
        }

        void loadPage()
    }, [])

    const groupedApplications = useMemo(() => {
        return {
            pending: applications.filter((application) => application.status === 'pending'),
            accepted: applications.filter((application) => application.status === 'accepted'),
            declined: applications.filter((application) => application.status === 'declined'),
        }
    }, [applications])

    const updateStatus = async (applicationId: string, status: ApplicationStatus) => {
        if (role !== 'manager') {
            return
        }

        setStatusMessage(null)
        setStatusType(null)
        setActiveApplicationId(applicationId)

        const result = await updateApplicationStatus(applicationId, status)

        setActiveApplicationId(null)

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to update application status.')
            return
        }

        setApplications((previous) =>
            previous.map((application) => {
                if (application.id !== applicationId) {
                    return application
                }

                return {
                    ...application,
                    status,
                }
            }),
        )

        setStatusType('success')
        setStatusMessage('Application status updated.')
    }

    const renderApplicationGroup = (groupTitle: string, items: ApplicationRecord[]) => (
        <article className="app-card">
            <p className="card-kicker">{groupTitle}</p>
            <h3>{items.length} {items.length === 1 ? 'application' : 'applications'}</h3>
            {items.length === 0 ? (
                <div className="empty-slot">No records in this status yet.</div>
            ) : (
                <div className="listing-board">
                    {items.map((application) => (
                        <article className="listing-entry" key={application.id}>
                            <header className="listing-entry-header">
                                <p className="listing-team">{application.teamName}</p>
                                <p className="listing-applicants">{application.status}</p>
                            </header>
                            <h4>{application.listingPosition}</h4>
                            <p>{application.message || 'No message provided.'}</p>

                            {role === 'manager' && application.status === 'pending' && (
                                <div className="role-switcher" role="group" aria-label="Manager decision actions">
                                    <button
                                        className="secondary-button role-switcher-button"
                                        type="button"
                                        onClick={() => void updateStatus(application.id, 'accepted')}
                                        disabled={activeApplicationId === application.id}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        className="secondary-button role-switcher-button"
                                        type="button"
                                        onClick={() => void updateStatus(application.id, 'declined')}
                                        disabled={activeApplicationId === application.id}
                                    >
                                        Decline
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </article>
    )

    return (
        <main className="app-page applications-page">
            <section className="app-hero applications-page-hero">
                <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />
                <div className="app-hero-content">
                    <p className="eyebrow">Applications</p>
                    <h1>Track statuses and decision flow.</h1>
                    <p className="lead-copy">
                        {role === 'manager'
                            ? 'Review incoming player applications and decide quickly.'
                            : 'Monitor your pending, accepted, and declined submissions.'}
                    </p>
                </div>
            </section>

            <section className="app-section applications-page-grid" aria-label="Application status modules">
                {renderApplicationGroup('Pending', groupedApplications.pending)}
                {renderApplicationGroup('Accepted', groupedApplications.accepted)}
                {renderApplicationGroup('Declined', groupedApplications.declined)}

                <article className="app-card app-card-wide">
                    <p className="card-kicker">Messages</p>
                    <h3>{isLoading ? 'Loading feed' : `${applications.length} total application records`}</h3>
                    <p>
                        The application feed is now sourced from the relational schema. Advanced threaded messaging is
                        still planned for a later milestone.
                    </p>
                    <div className="empty-slot">Real-time chat is not implemented in this release.</div>
                </article>
            </section>

            {statusMessage && (
                <section className="app-section" aria-label="Application status">
                    <p className={`form-status ${statusType === 'error' ? 'error' : 'success'}`} role="status">
                        {statusMessage}
                    </p>
                </section>
            )}

        </main>
    )
}

export default ApplicationsPage
