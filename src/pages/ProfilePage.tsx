import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import SiteNavbar from '../components/SiteNavbar'
import { getCurrentProfile, updateProfileIdentity, upsertProfile, type CurrentProfile } from '../services/profile'

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

const splitPositions = (value: string) => {
    const parsedPositions = value
        .split(',')
        .map((position) => position.trim())
        .filter((position) => position.length > 0)

    return parsedPositions.length > 0 ? parsedPositions : ['']
}

const isBlank = (value: string) => value.trim().length === 0

const buildInitials = (displayName: string) => {
    const segments = displayName
        .split(' ')
        .map((segment) => segment.trim())
        .filter((segment) => segment.length > 0)

    if (segments.length === 0) {
        return 'PL'
    }

    return segments
        .slice(0, 2)
        .map((segment) => segment.charAt(0).toUpperCase())
        .join('')
}

const ProfilePage = () => {
    const location = useLocation()
    const didStartOutsideEditorRef = useRef(false)
    const [profile, setProfile] = useState<CurrentProfile | null>(null)
    const [isPreviewMode, setIsPreviewMode] = useState(false)
    const [isEditorOpen, setIsEditorOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [loadMessage, setLoadMessage] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [statusType, setStatusType] = useState<'error' | 'success' | null>(null)
    const [birthdayInput, setBirthdayInput] = useState('')
    const [selectedPositions, setSelectedPositions] = useState<string[]>([''])
    const [heightUnit, setHeightUnit] = useState<HeightUnit>('metric')
    const [heightMetricInput, setHeightMetricInput] = useState('')
    const [heightFeetInput, setHeightFeetInput] = useState('')
    const [heightInchesInput, setHeightInchesInput] = useState('')
    const [fullNameInput, setFullNameInput] = useState('')
    const [usernameInput, setUsernameInput] = useState('')
    const [bioInput, setBioInput] = useState('')
    const [videoUrlInput, setVideoUrlInput] = useState('')

    const navLinks = [
        { label: 'Teams', href: '/teams' },
        { label: 'Listings', href: '/listings' },
        { label: 'For You', href: '/for-you' },
        { label: 'Applications', href: '/applications' },
        { label: 'Profile', href: '/profile' },
    ]

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const previewRole = params.get('preview')
        setIsEditorOpen(false)

        if (previewRole === 'player' || previewRole === 'manager') {
            setIsPreviewMode(true)
            // Demo preview mode
            const demoProfile: CurrentProfile = previewRole === 'player'
                ? {
                    userId: 'demo-player-123',
                    email: 'player.demo@pitchlink.com',
                    fullName: 'Player Demo',
                    username: 'player.demo',
                    role: 'player',
                    birthday: '2002-05-15',
                    position: 'Striker, Right Winger',
                    height: '180',
                    bio: 'Aggressive forward with a knack for late runs. Looking for a team that values pace and finishing.',
                    videoUrl: 'https://www.youtube.com/watch?v=playerdemo',
                }
                : {
                    userId: 'demo-manager-456',
                    email: 'manager.demo@pitchlink.com',
                    fullName: 'Manager Demo',
                    username: 'manager.demo',
                    role: 'manager',
                    birthday: '',
                    position: '',
                    height: '',
                    bio: 'Manager for City United FC. Focused on building a dynamic, youth-driven squad for the upcoming season.',
                    videoUrl: 'https://www.youtube.com/watch?v=managerdemo',
                }
            setProfile(demoProfile)
            setBirthdayInput(demoProfile.birthday)
            setSelectedPositions(splitPositions(demoProfile.position))
            setHeightUnit('metric')
            setHeightMetricInput(demoProfile.height)
            setHeightFeetInput('')
            setHeightInchesInput('')
            setFullNameInput(demoProfile.fullName)
            setUsernameInput(demoProfile.username)
            setBioInput(demoProfile.bio)
            setVideoUrlInput(demoProfile.videoUrl)
            setIsLoading(false)
            setLoadMessage(null)
            return
        }

        setIsPreviewMode(false)

        const loadProfile = async () => {
            setIsLoading(true)
            setLoadMessage(null)

            const result = await getCurrentProfile()

            if (!result.ok || !result.profile) {
                setLoadMessage(result.message ?? 'Unable to load your profile right now.')
                setProfile(null)
                setIsLoading(false)
                return
            }

            const loadedProfile = result.profile
            setProfile(loadedProfile)
            setBirthdayInput(loadedProfile.birthday)
            setSelectedPositions(splitPositions(loadedProfile.position))
            setHeightUnit('metric')
            setHeightMetricInput(loadedProfile.height)
            setHeightFeetInput('')
            setHeightInchesInput('')
            setFullNameInput(loadedProfile.fullName)
            setUsernameInput(loadedProfile.username)
            setBioInput(loadedProfile.bio)
            setVideoUrlInput(loadedProfile.videoUrl)
            setIsLoading(false)
        }

        void loadProfile()
    }, [location.search])

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
        if (profile?.role !== 'player') {
            return { isValid: true, message: '', type: 'info' as const }
        }

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

        if (!profile) {
            return
        }

        setStatusMessage(null)
        setStatusType(null)

        const isPlayer = profile.role === 'player'
        const heightValidation = getHeightValidation()
        const sanitizedName = fullNameInput.trim()
        const sanitizedUsername = usernameInput.trim().toLowerCase()

        if (sanitizedName.length < 2) {
            setStatusType('error')
            setStatusMessage('Enter your full name.')
            return
        }

        if (!/^[a-z0-9._-]{3,30}$/.test(sanitizedUsername)) {
            setStatusType('error')
            setStatusMessage(
                'Username must be 3-30 chars and only include lowercase letters, numbers, dots, underscores, or hyphens.',
            )
            return
        }

        if (isPlayer && !heightValidation.isValid) {
            setStatusType('error')
            setStatusMessage(heightValidation.message)
            return
        }

        const positionValue = selectedPositions.filter((position) => position.length > 0).join(', ')
        const heightInCentimeters = isPlayer ? getHeightInCentimeters() : null

        if (isPreviewMode) {
            setProfile((previousProfile) => {
                if (!previousProfile) {
                    return previousProfile
                }

                return {
                    ...previousProfile,
                    fullName: sanitizedName,
                    username: sanitizedUsername,
                    birthday: isPlayer ? birthdayInput : '',
                    position: isPlayer ? positionValue : '',
                    height: isPlayer && heightInCentimeters !== null ? formatNumber(heightInCentimeters) : '',
                    bio: bioInput,
                    videoUrl: videoUrlInput,
                }
            })

            setStatusType('success')
            setStatusMessage('Preview updated locally. Sign in to save to your real profile.')
            return
        }

        setIsSaving(true)

        const identityResult = await updateProfileIdentity({
            fullName: sanitizedName,
            username: sanitizedUsername,
        })

        if (!identityResult.ok) {
            setStatusType('error')
            setStatusMessage(identityResult.message ?? 'Unable to save profile identity. Please try again.')
            setIsSaving(false)
            return
        }

        const result = await upsertProfile({
            role: profile.role,
            birthday: isPlayer ? birthdayInput : '',
            position: isPlayer ? positionValue : '',
            height: isPlayer && heightInCentimeters !== null ? formatNumber(heightInCentimeters) : '',
            bio: bioInput,
            videoUrl: videoUrlInput,
        })

        if (!result.ok) {
            setStatusType('error')
            setStatusMessage(result.message ?? 'Unable to save profile updates. Please try again.')
            setIsSaving(false)
            return
        }

        setProfile((previousProfile) => {
            if (!previousProfile) {
                return previousProfile
            }

            return {
                ...previousProfile,
                fullName: sanitizedName,
                username: sanitizedUsername,
                birthday: isPlayer ? birthdayInput : '',
                position: isPlayer ? positionValue : '',
                height: isPlayer && heightInCentimeters !== null ? formatNumber(heightInCentimeters) : '',
                bio: bioInput,
                videoUrl: videoUrlInput,
            }
        })

        setStatusType('success')
        setStatusMessage('Profile changes saved successfully.')
        setIsSaving(false)
    }

    const heightValidation = getHeightValidation()

    const displayName = profile ? profile.fullName : ''
    const handleName = profile ? profile.username : 'pitchlink'
    const profileInitials = buildInitials(displayName)
    const positionTags = selectedPositions.filter((position) => position.length > 0)

    return (
        <main className="app-page profile-page">
            <SiteNavbar links={navLinks} ctaLabel="Sign In" ctaTo="/login" />

            <section className="app-section profile-layout-shell" aria-label="Profile page">
                {isLoading && (
                    <article className="app-card">
                        <p className="card-kicker">Loading</p>
                        <h3>Fetching your profile</h3>
                        <p>Please wait while we load your account details.</p>
                    </article>
                )}

                {!isLoading && loadMessage && (
                    <article className="app-card">
                        <p className="card-kicker">Access Required</p>
                        <h3>Unable to load your profile</h3>
                        <p>{loadMessage}</p>
                        <Link className="primary-button profile-inline-button" to="/login">
                            Go to Sign In
                        </Link>
                    </article>
                )}

                {!isLoading && profile && (
                    <>
                        <article className="app-card profile-header-card">
                            <div className="profile-avatar" aria-hidden="true">
                                {profileInitials}
                            </div>

                            <div className="profile-header-content">
                                <p className="profile-title">{displayName}</p>
                                <p className="profile-handle">@{handleName}</p>

                                <p className="profile-description">
                                    {bioInput.length > 0
                                        ? bioInput
                                        : profile.role === 'player'
                                            ? 'Player profile ready for recruiting visibility.'
                                            : 'Manager profile ready to coordinate recruiting efforts.'}
                                </p>

                                <div className="profile-chip-row" aria-label="Profile tags">
                                    {profile.role === 'manager' && <span className="profile-chip">Manager</span>}

                                    {profile.role === 'player' && positionTags.length === 0 && (
                                        <span className="profile-chip">Position Pending</span>
                                    )}

                                    {profile.role === 'player' && positionTags.length > 0 &&
                                        positionTags.slice(0, 3).map((position) => (
                                            <span className="profile-chip" key={position}>
                                                {position}
                                            </span>
                                        ))}
                                </div>



                            </div>

                            <div className="profile-action-buttons" aria-label="Profile actions">
                                <button className="profile-action-button" type="button" aria-label="Share profile" disabled>
                                    <svg className="profile-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M16 6a3 3 0 1 0-2.83-4H13a3 3 0 0 0 .17 1l-6.2 3.1A3 3 0 0 0 4 5a3 3 0 1 0 2.97 3.4l6.2 3.1A3 3 0 1 0 14 10a3 3 0 0 0-.83.12l-6.2-3.1A3 3 0 0 0 7 7a3 3 0 0 0-.03-.4l6.2-3.1A3 3 0 0 0 16 6Zm0 8a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM4 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0 10a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </button>

                                <button
                                    className="profile-action-button"
                                    type="button"
                                    aria-label="Edit profile"
                                    onClick={() => setIsEditorOpen(true)}
                                >
                                    <svg className="profile-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M16.862 3.487a2.1 2.1 0 0 1 2.971 0l.68.681a2.1 2.1 0 0 1 0 2.972l-1.03 1.03-3.652-3.652 1.03-1.031ZM14.71 5.608l3.652 3.652-9.4 9.4-4.272.62.62-4.272 9.4-9.4Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </button>

                                <button className="profile-action-button" type="button" aria-label="Profile settings" disabled>
                                    <svg className="profile-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                                        <path
                                            d="M10.2 2h3.6l.44 2.18a7.9 7.9 0 0 1 1.63.68l1.88-1.18 2.55 2.55-1.18 1.88c.28.52.5 1.06.68 1.63L22 10.2v3.6l-2.18.44a7.9 7.9 0 0 1-.68 1.63l1.18 1.88-2.55 2.55-1.88-1.18c-.52.28-1.06.5-1.63.68L13.8 22h-3.6l-.44-2.18a7.9 7.9 0 0 1-1.63-.68l-1.88 1.18-2.55-2.55 1.18-1.88a7.9 7.9 0 0 1-.68-1.63L2 13.8v-3.6l2.18-.44c.18-.57.4-1.11.68-1.63L3.68 6.25 6.23 3.7l1.88 1.18c.52-.28 1.06-.5 1.63-.68L10.2 2Zm1.8 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </article>

                        {isEditorOpen && (
                            <div
                                className="profile-editor-overlay"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="profile-editor-title"
                                onMouseDown={(event) => {
                                    didStartOutsideEditorRef.current = event.target === event.currentTarget
                                }}
                                onClick={(event) => {
                                    if (event.target !== event.currentTarget) {
                                        return
                                    }

                                    if (didStartOutsideEditorRef.current) {
                                        setIsEditorOpen(false)
                                    }

                                    didStartOutsideEditorRef.current = false
                                }}
                            >
                                <article
                                    className="app-card app-card-wide profile-editor-card profile-editor-modal"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <div className="profile-editor-topbar">
                                        <div>
                                            <p className="card-kicker">Editor</p>
                                            <h3 id="profile-editor-title">
                                                {profile.role === 'player' ? 'Edit player details' : 'Edit manager details'}
                                            </h3>
                                        </div>

                                        <button
                                            className="secondary-button profile-editor-close"
                                            type="button"
                                            onClick={() => setIsEditorOpen(false)}
                                        >
                                            Close
                                        </button>
                                    </div>

                                    <form className="auth-form profile-edit-form" onSubmit={handleSubmit} noValidate>
                                        <label htmlFor="fullName">Full name</label>
                                        <input
                                            id="fullName"
                                            type="text"
                                            autoComplete="name"
                                            minLength={2}
                                            value={fullNameInput}
                                            onChange={(event) => setFullNameInput(event.target.value)}
                                            required
                                        />

                                        <label htmlFor="username">Username</label>
                                        <input
                                            id="username"
                                            type="text"
                                            autoComplete="username"
                                            pattern="^[a-z0-9._-]{3,30}$"
                                            title="3-30 chars: lowercase letters, numbers, dots, underscores, or hyphens."
                                            value={usernameInput}
                                            onChange={(event) => setUsernameInput(event.target.value.toLowerCase())}
                                            required
                                        />

                                        <label htmlFor="email">Email</label>
                                        <input id="email" value={profile.email} readOnly disabled />

                                        <label htmlFor="role">Role</label>
                                        <input
                                            id="role"
                                            value={profile.role === 'player' ? 'Player' : 'Manager'}
                                            readOnly
                                            disabled
                                        />

                                        {profile.role === 'player' ? (
                                            <>
                                                <label htmlFor="birthday">Birthday</label>
                                                <input
                                                    id="birthday"
                                                    name="birthday"
                                                    type="date"
                                                    value={birthdayInput}
                                                    onChange={(event) => setBirthdayInput(event.target.value)}
                                                />

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
                                            </>
                                        ) : (
                                            <p className="auth-helper-text">
                                                Manager accounts do not currently include player-only fields like birthday,
                                                position, or height.
                                            </p>
                                        )}

                                        <label htmlFor="bio">{profile.role === 'player' ? 'Bio' : 'Organization Bio'}</label>
                                        <textarea
                                            id="bio"
                                            rows={4}
                                            value={bioInput}
                                            onChange={(event) => setBioInput(event.target.value)}
                                            placeholder={
                                                profile.role === 'player'
                                                    ? 'Share your style of play, strengths, and goals.'
                                                    : 'Describe your club, recruiting style, and priorities.'
                                            }
                                        />

                                        <label htmlFor="videoUrl">
                                            {profile.role === 'player' ? 'Highlight Video URL' : 'Team or Recruitment Video URL'}
                                        </label>
                                        <input
                                            id="videoUrl"
                                            type="url"
                                            value={videoUrlInput}
                                            onChange={(event) => setVideoUrlInput(event.target.value)}
                                            placeholder={
                                                profile.role === 'player'
                                                    ? 'https://your-highlight-video-link'
                                                    : 'https://your-team-video-link'
                                            }
                                        />

                                        <button className="primary-button" type="submit" disabled={isSaving}>
                                            {isSaving ? 'Saving changes...' : isPreviewMode ? 'Update preview' : 'Save changes'}
                                        </button>

                                        {statusMessage && (
                                            <p className={`form-status ${statusType === 'error' ? 'error' : 'success'}`} role="status">
                                                {statusMessage}
                                            </p>
                                        )}
                                    </form>
                                </article>
                            </div>
                        )}
                    </>
                )}
            </section>

            <SiteFooter
                className="page-footer"
                text="Need to continue exploring opportunities?"
                linkLabel="Browse listings"
                linkTo="/listings"
            />
        </main>
    )
}

export default ProfilePage
