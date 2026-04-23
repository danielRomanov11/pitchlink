type MatchScoreBarProps = {
    score: number
    label?: string
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const getBarGradient = (score: number) => {
    if (score <= 40) {
        return 'from-red-700 via-red-500 to-orange-500'
    }

    if (score <= 70) {
        return 'from-amber-700 via-orange-500 to-amber-300'
    }

    return 'from-emerald-700 via-green-500 to-lime-400'
}

const getScoreTier = (score: number) => {
    if (score <= 40) {
        return 'Bad'
    }

    if (score <= 70) {
        return 'Mid'
    }

    return 'Good'
}

const MatchScoreBar = ({ score, label = 'Match score' }: MatchScoreBarProps) => {
    const normalizedScore = clampScore(score)
    const scoreTier = getScoreTier(normalizedScore)

    return (
        <div className="w-full">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                <span>{label}</span>
                <span>{scoreTier}</span>
            </div>

            <div
                className="relative h-9 w-full overflow-hidden rounded-xl border border-white/20 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={normalizedScore}
            >
                <div
                    className={`h-full rounded-xl bg-gradient-to-r ${getBarGradient(normalizedScore)} transition-all duration-700 ease-out`}
                    style={{ width: `${normalizedScore}%` }}
                />

                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.05)_35%,rgba(255,255,255,0)_60%)]" />

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-extrabold tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
                    {normalizedScore}%
                </div>
            </div>
        </div>
    )
}

export default MatchScoreBar
