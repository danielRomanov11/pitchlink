import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { signInWithEmail } from '../services/auth'

const LoginPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatusMessage(null)
        setStatusType(null)

        const formData = new FormData(event.currentTarget)
        const email = String(formData.get('email') ?? '').trim()
        const password = String(formData.get('password') ?? '').trim()

        if (!email || !password) {
            setStatusType('error')
            setStatusMessage('Enter both email and password.')
            return
        }

        setIsSubmitting(true)

        try {
            const result = await signInWithEmail({ email, password })

            if (!result.ok) {
                setStatusType('error')
                setStatusMessage(result.message ?? 'Sign in failed. Try again.')
                return
            }

            setStatusType('success')
            setStatusMessage('Signed in successfully.')

            const fromState = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
            const destinationPath = fromState?.pathname
                ? `${fromState.pathname}${fromState.search ?? ''}`
                : '/profile'

            navigate(destinationPath, { replace: true })
        } catch {
            setStatusType('error')
            setStatusMessage('Unexpected error while signing in.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Sign in to manage your profile, applications, and team matches."
            footerText="New to Pitch Link?"
            footerLinkLabel="Create an account"
            footerLinkTo="/signup"
        >
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required />

                <div className="auth-row">
                    <label htmlFor="password">Password</label>
                    <Link className="text-link" to="/signup">
                        Need an account?
                    </Link>
                </div>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    minLength={8}
                    required
                />

                <button className="primary-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>

                {statusMessage && (
                    <p className={`form-status ${statusType === 'error' ? 'error' : 'success'}`} role="status">
                        {statusMessage}
                    </p>
                )}
            </form>
        </AuthLayout>
    )
}

export default LoginPage
