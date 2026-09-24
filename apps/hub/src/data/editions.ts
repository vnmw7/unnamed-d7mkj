export type EditionStatus = 'current' | 'archived'

export interface Edition {
  year: number
  slug: string
  title: string
  href: string
  status: EditionStatus
  releasedAt: string
  cover?: string
  description?: string
}

export const editions: Edition[] = [
  {
    year: 2026,
    slug: '2026',
    title: "Floating Messages",
    href: '/2026/',
    status: 'current',
    releasedAt: '2026-10-08',
    description: 'A 360° room you look around in by turning your phone.',
  },
]

export const currentEdition =
  editions.find((edition) => edition.status === 'current') ?? null

export const editionsNewestFirst = [...editions].sort(
  (a, b) => b.year - a.year,
)
