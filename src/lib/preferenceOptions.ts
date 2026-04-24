export const levelOfPlayOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'semipro', label: 'Semi-Pro' },
    { value: 'college', label: 'College' },
    { value: 'amateur', label: 'Amateur' },
    { value: 'club', label: 'Club' },
    { value: 'highschool', label: 'High School' },
] as const

export type LevelOfPlayOptionValue = (typeof levelOfPlayOptions)[number]['value']
