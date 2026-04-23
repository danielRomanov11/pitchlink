import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import type { UserRole } from '../services/auth'
import { upsertProfile } from '../services/profile'
import { upsertCurrentPlayerPreference } from '../services/preference'

type HeightUnit = 'metric' | 'imperial'

const MIN_HEIGHT_CM = 100
const MAX_HEIGHT_CM = 260

const positionOptions = [
    'Goalkeeper',
    'Center Back',
    'Left Back',
    'Right Back',
    'Defensive Midfielder',
    'Central Midfielder',
    'Attacking Midfielder',
    'Left Midfielder',
    'Right Midfielder',
    'Left Winger',
    'Right Winger',
    'Striker',
]

const preferredLeagueOptions = ['Professional', 'Semi-Pro', 'College', 'Amateur', 'Club', 'High School']

const parseRole = (value: string | null | undefined): UserRole | null => {
    if (value === 'player' || value === 'manager') {
        return value
    }

    return null
}

const parseNumberInput = (value: string) => {
    const normalizedValue = value.trim()
    if (!normalizedValue) {
        return null
    }

    const parsedValue = Number(normalizedValue)
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return null
    }

    return parsedValue
}

const formatNumber = (value: number) => String(Number(value.toFixed(2)))

const imperialInputsToCm = (feetInput: string, inchesInput: string) => {
    const feet = parseNumberInput(feetInput)
    const inches = parseNumberInput(inchesInput)

    if (feet === null && inches === null) {
        return null
    }

    const totalInches = (feet ?? 0) * 12 + (inches ?? 0)
    return totalInches * 2.54
}

const cmToImperialInputs = (centimeters: number) => {
    const totalInches = centimeters / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches - feet * 12

    return {
        feet: String(feet),
        inches: formatNumber(inches),
    }
}

const isBlank = (value: string) => value.trim().length === 0

const CompleteProfilePage = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)

    const roleFromQuery = useMemo(() => {
        const roleQueryParam = new URLSearchParams(location.search).get('role')
        return parseRole(roleQueryParam)
    }, [location.search])

    const roleFromState = parseRole((location.state as { role?: string } | null)?.role)

    const [selectedRole] = useState<UserRole>(roleFromQuery ?? roleFromState ?? 'player')
    const [selectedPositions, setSelectedPositions] = useState<string[]>([''])
    const [preferredLeague, setPreferredLeague] = useState('')
    const [preferredLocation, setPreferredLocation] = useState('')
    const [heightUnit, setHeightUnit] = useState<HeightUnit>('metric')
    const [heightMetricInput, setHeightMetricInput] = useState('')
    const [heightFeetInput, setHeightFeetInput] = useState('')
    const [heightInchesInput, setHeightInchesInput] = useState('')

    const handlePositionChange = (index: number, value: string) => {
        setSelectedPositions((previousPositions) => {
            const nextPositions = [...previousPositions]
            nextPositions[index] = value
            return nextPositions
        })
    }

    const addAnotherPosition = () => {
        setSelectedPositions((previousPositions) => [...previousPositions, ''])
    }

    const removePosition = (indexToRemove: number) => {
        setSelectedPositions((previousPositions) => previousPositions.filter((_, index) => index !== indexToRemove))
    }

    const canAddAnotherPosition =
        selectedPositions.some((position) => position.length > 0) && selectedPositions.length < positionOptions.length

    const isPositionAlreadySelected = (position: string, currentIndex: number) =>
        selectedPositions.some((selectedPosition, index) => index !== currentIndex && selectedPosition === position)

    const handleHeightUnitChange = (nextUnit: HeightUnit) => {
        if (nextUnit === heightUnit) {
            return
        }

        if (nextUnit === 'imperial') {
            const heightCm = parseNumberInput(heightMetricInput)

            if (heightCm === null) {
                setHeightFeetInput('')
                setHeightInchesInput('')
            } else {
                const convertedHeight = cmToImperialInputs(heightCm)
                setHeightFeetInput(convertedHeight.feet)
                setHeightInchesInput(convertedHeight.inches)
            }
        } else {
            const convertedHeight = imperialInputsToCm(heightFeetInput, heightInchesInput)
            setHeightMetricInput(convertedHeight === null ? '' : formatNumber(convertedHeight))
        }

        setHeightUnit(nextUnit)
    }

    const getHeightInCentimeters = () => {
        if (heightUnit === 'metric') {
            return parseNumberInput(heightMetricInput)
        }

        return imperialInputsToCm(heightFeetInput, heightInchesInput)
    }

    const hasAnyHeightInput = () => {
        if (heightUnit === 'metric') {
            return !isBlank(heightMetricInput)
        }

        return !isBlank(heightFeetInput) || !isBlank(heightInchesInput)
    }

    const getHeightValidation = () => {
        const hasInput = hasAnyHeightInput()
        const heightInCentimeters = getHeightInCentimeters()

        if (!hasInput) {
            return { isValid: true, message: 'Optional. Height is stored in cm when provided.', type: 'info' as const }
        }

        if (heightInCentimeters === null) {
            return { isValid: false, message: 'Enter a valid non-negative height value.', type: 'error' as const }
        }

        if (heightInCentimeters < MIN_HEIGHT_CM || heightInCentimeters > MAX_HEIGHT_CM) {
            return {
                isValid: false,
                message: `Height must be between ${MIN_HEIGHT_CM} cm and ${MAX_HEIGHT_CM} cm.`,
                type: 'error' as const,
            }
        }

        return {
            isValid: true,
            message: `Will be stored as ${formatNumber(heightInCentimeters)} cm.`,
            type: 'info' as const,
        }
    }

    const normalizeImperialInputs = (feetValue: string, inchesValue: string) => {
        const feet = parseNumberInput(feetValue)
        const inches = parseNumberInput(inchesValue)

        if (inches === null || inches < 12) {
            return {
                feet: feetValue,
                inches: inchesValue,
            }
        }

        const normalizedFeet = (feet ?? 0) + Math.floor(inches / 12)
        const normalizedInches = inches - Math.floor(inches / 12) * 12

        return {
            feet: String(normalizedFeet),
            inches: formatNumber(normalizedInches),
        }
    }

    const handleImperialFeetChange = (value: string) => {
        setHeightFeetInput(value)
    }

    const handleImperialInchesChange = (value: string) => {
        const normalizedValues = normalizeImperialInputs(heightFeetInput, value)
        setHeightFeetInput(normalizedValues.feet)
        setHeightInchesInput(normalizedValues.inches)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setStatusMessage(null)
        setStatusType(null)

        const formData = new FormData(event.currentTarget)

        const heightValidation = getHeightValidation()
        if (!heightValidation.isValid) {
            setStatusType('error')
            setStatusMessage(heightValidation.message)
            return
        }

        setIsSubmitting(true)

        try {
            const positionValue = selectedPositions.filter((position) => position.length > 0).join(', ')
            const heightInCentimeters = getHeightInCentimeters()

            const result = await upsertProfile({
                role: selectedRole,
                birthday: String(formData.get('birthday') ?? ''),
                position: positionValue,
                height: heightInCentimeters === null ? '' : formatNumber(heightInCentimeters),
                bio: String(formData.get('bio') ?? ''),
                videoUrl: String(formData.get('videoUrl') ?? ''),
            })

            if (!result.ok) {
                setStatusType('error')
                setStatusMessage(result.message ?? 'Unable to save profile details. Try again.')
                return
            }

            if (selectedRole === 'player') {
                const preferenceResult = await upsertCurrentPlayerPreference({
                    preferredLeagues: preferredLeague ? [preferredLeague] : [],
                    preferredLocations: [preferredLocation],
                })

                if (!preferenceResult.ok) {
                    setStatusType('error')
                    setStatusMessage(preferenceResult.message ?? 'Unable to save your preferences. Try again.')
                    return
                }
            }

            setStatusType('success')
            setStatusMessage('Profile saved. Redirecting...')
            setTimeout(() => {
                navigate('/profile')
            }, 500)
        } catch {
            setStatusType('error')
            setStatusMessage('Unexpected error while saving your profile.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const heightValidation = getHeightValidation()

    return (
        <AuthLayout
            title="Complete your profile"
            subtitle="Add your additional details so Pitch Link can personalize your experience."
            footerText="Want to skip for now?"
            footerLinkLabel="Go to Home"
            footerLinkTo="/"
        >

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="role">Role</label>
                <input id="role" name="role" value={selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} readOnly disabled />

                {selectedRole === 'player' ? (
                    <>
                        <label htmlFor="birthday">Birthday</label>
                        <input id="birthday" name="birthday" type="date" />

                        <label htmlFor="position-0">Position</label>
                        <div className="position-fields" aria-label="Player positions">
                            {selectedPositions.map((position, index) => (
                                <div className="position-row" key={`position-${index}`}>
                                    <select
                                        id={`position-${index}`}
                                        value={position}
                                        onChange={(event) => handlePositionChange(index, event.target.value)}
                                    >
                                        <option value="">Select a position</option>
                                        {positionOptions.map((positionOption) => (
                                            <option
                                                key={positionOption}
                                                value={positionOption}
                                                disabled={isPositionAlreadySelected(positionOption, index)}
                                            >
                                                {positionOption}
                                            </option>
                                        ))}
                                    </select>

                                    {index > 0 && (
                                        <button
                                            className="position-remove-button"
                                            type="button"
                                            aria-label={`Remove position ${index + 1}`}
                                            onClick={() => removePosition(index)}
                                        >
                                            X
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {canAddAnotherPosition && (
                            <button
                                className="secondary-button position-add-button"
                                type="button"
                                onClick={addAnotherPosition}
                            >
                                Add another position
                            </button>
                        )}

                        <label htmlFor="preferredLeague">Preferred level</label>
                        <select
                            id="preferredLeague"
                            name="preferredLeague"
                            value={preferredLeague}
                            onChange={(event) => setPreferredLeague(event.target.value)}
                        >
                            <option value="">Select a level</option>
                            {preferredLeagueOptions.map((leagueOption) => (
                                <option key={leagueOption} value={leagueOption}>
                                    {leagueOption}
                                </option>
                            ))}
                        </select>

                        <label htmlFor="preferredLocation">Preferred location</label>
                        <input
                            id="preferredLocation"
                            name="preferredLocation"
                            type="text"
                            placeholder="City, state, or region"
                            value={preferredLocation}
                            onChange={(event) => setPreferredLocation(event.target.value)}
                        />

                        <label htmlFor="height">Height</label>
                        <div className="height-unit-toggle" role="group" aria-label="Height unit">
                            <button
                                type="button"
                                className={`secondary-button height-unit-button ${heightUnit === 'metric' ? 'active' : ''}`}
                                onClick={() => handleHeightUnitChange('metric')}
                            >
                                Metric (cm)
                            </button>
                            <button
                                type="button"
                                className={`secondary-button height-unit-button ${heightUnit === 'imperial' ? 'active' : ''}`}
                                onClick={() => handleHeightUnitChange('imperial')}
                            >
                                Imperial (ft/in)
                            </button>
                        </div>

                        {heightUnit === 'metric' ? (
                            <input
                                id="height"
                                type="number"
                                step="0.01"
                                min={MIN_HEIGHT_CM}
                                max={MAX_HEIGHT_CM}
                                placeholder="e.g. 178"
                                value={heightMetricInput}
                                onChange={(event) => setHeightMetricInput(event.target.value)}
                            />
                        ) : (
                            <div className="height-imperial-grid">
                                <input
                                    id="height-feet"
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="Feet"
                                    value={heightFeetInput}
                                    onChange={(event) => handleImperialFeetChange(event.target.value)}
                                />
                                <input
                                    id="height-inches"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Inches"
                                    value={heightInchesInput}
                                    onChange={(event) => handleImperialInchesChange(event.target.value)}
                                />
                            </div>
                        )}

                        <p className={`auth-helper-text ${heightValidation.type === 'error' ? 'error' : ''}`}>
                            {heightValidation.message}
                        </p>


                        <label htmlFor="bio">Bio</label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows={4}
                            placeholder="Share your style of play, strengths, and current goals."
                        />

                        <label htmlFor="videoUrl">Video URL</label>
                        <input
                            id="videoUrl"
                            name="videoUrl"
                            type="url"
                            placeholder="https://your-highlight-video-link"
                        />
                    </>
                ) : (
                    <p className="auth-helper-text">
                        Manager accounts have no additional required fields yet. Save to finish setup, then use{' '}
                        <Link className="text-link" to="/teams">
                            Teams
                        </Link>{' '}
                        to continue.
                    </p>
                )}

                <button className="primary-button" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving profile...' : 'Finish setup'}
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

export default CompleteProfilePage
