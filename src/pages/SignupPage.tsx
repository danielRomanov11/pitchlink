import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { signUpWithEmail } from '../services/auth'

const SignupPage = () => {
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)
    const [selectedRole, setSelectedRole] = useState<'player' | 'manager'>('player')

    const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedRole(event.target.value as 'player' | 'manager')
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatusMessage(null)
        setStatusType(null)

        const formData = new FormData(event.currentTarget)
        const fullName = String(formData.get('fullName') ?? '').trim()
        const email = String(formData.get('email') ?? '').trim()
        const password = String(formData.get('password') ?? '').trim()
        const confirmPassword = String(formData.get('confirmPassword') ?? '').trim()

        if (!fullName || !email || !password || !confirmPassword) {
            setStatusType('error')
            setStatusMessage('Complete all fields before continuing.')
            return
        }

        if (fullName.length < 2) {
            setStatusType('error')
            setStatusMessage('Enter your full name.')
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
            const result = await signUpWithEmail({ fullName, email, password, role: selectedRole })

            if (!result.ok) {
                setStatusType('error')
                setStatusMessage(result.message ?? 'Sign up failed. Try again.')
                return
            }

            if (result.requiresEmailVerification) {
                setStatusType('success')
                setStatusMessage(result.message ?? 'Check your email to verify your account.')
                return
            }

            setStatusType('success')
            setStatusMessage(result.message ?? 'Account created successfully.')
            navigate(`/complete-profile?role=${selectedRole}`, {
                state: {
                    role: selectedRole,
                },
            })
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
                <label htmlFor="fullName">Full name</label>
                <input id="fullName" name="fullName" type="text" autoComplete="name" minLength={2} required />

                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" autoComplete="email" required />

                <label htmlFor="role">Role</label>
                <select id="role" name="role" value={selectedRole} onChange={handleRoleChange}>
                    <option value="player">Player</option>
                    <option value="manager">Manager</option>
                </select>

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
