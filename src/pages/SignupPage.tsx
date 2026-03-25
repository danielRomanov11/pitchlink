import { useState } from 'react'
import type { FormEvent } from 'react'
import AuthLayout from '../components/AuthLayout'
import { signUpWithEmail } from '../services/auth'

const SignupPage = () => {
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
        const confirmPassword = String(formData.get('confirmPassword') ?? '').trim()

        if (!email || !password || !confirmPassword) {
            setStatusType('error')
            setStatusMessage('Complete all fields before continuing.')
            return
        }

        if (password.length < 8) {
            setStatusType('error')
            setStatusMessage('Password must be at least 8 characters.')
            return
        }

        if (password !== confirmPassword) {
            setStatusType('error')
            setStatusMessage('Passwords do not match.')
            return
        }

        setIsSubmitting(true)

        try {
            const result = await signUpWithEmail({ email, password })

            if (!result.ok) {
                setStatusType('error')
                setStatusMessage(result.message ?? 'Sign up failed. Try again.')
                return
            }

            setStatusType('success')
            setStatusMessage(result.message ?? 'Account created successfully.')
            event.currentTarget.reset()
        } catch {
            setStatusType('error')
            setStatusMessage('Unexpected error while creating account.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AuthLayout
            title="Create your account"
            subtitle="Join Pitch Link and start connecting with teams that fit your game."
            footerText="Already have an account?"
            footerLinkLabel="Sign in"
            footerLinkTo="/login"
        >
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required />

                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                />

                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                />

                <button className="primary-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Create account'}
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

export default SignupPage
