export type DeviceClass = 'mobile' | 'desktop'

function detectDeviceClass(): DeviceClass {
  if (typeof window === 'undefined') {
    return 'desktop'
  }

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const mobileAgent = /android|iphone|ipad|ipod|mobile/i.test(
    navigator.userAgent,
  )

  return coarsePointer || mobileAgent ? 'mobile' : 'desktop'
}

export const deviceClass = detectDeviceClass()

export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const env = import.meta.env as { VITE_FAN_LETTERS_BASE?: string }

// Debug affordance: ?lettersSpeed=<multiplier> (e.g. 0 freezes the orbit)
// so layouts and tap targets can be inspected deterministically.
const speedParam = new URLSearchParams(
  window.location.search,
).get('lettersSpeed')

export const debugSpeedFactor =
  speedParam === null
    ? 1
    : Math.max(0, Number(speedParam) || 0)

/**
 * Content lives outside the app bundle (R2 in production, the committed
 * sample under public/fan-letters for local dev). Override the base with
 * VITE_FAN_LETTERS_BASE at build time once the bucket is live.
 */
export const fanLetterConfig = {
  baseUrl: (
    env.VITE_FAN_LETTERS_BASE ??
    `${import.meta.env.BASE_URL}fan-letters`
  ).replace(/\/+$/, ''),
  // Room is 12 x 12 m with a 5 m ceiling (walls at +/-6, floor 0) and the
  // camera sits at y = 1.6; the band below keeps cards well inside it.
  radiusRange: [2.2, 4.6] as const,
  heightRange: [0.7, 4.3] as const,
  slotHeightRange: [0.3, 0.55] as const,
  rollRange: 0.35,
  bandCount: 3,
  bandSpeedFactors: [1.12, 1.0, 0.9],
  baseAngularSpeed: 0.025,
  speedJitter: [0.85, 1.15] as const,
  activeSlots: { mobile: 160, desktop: 240 } as const,
  maxActivePages: { mobile: 5, desktop: 6 } as const,
  maxResidentPages: { mobile: 6, desktop: 8 } as const,
  fadeDurationMs: 600,
  rotationIntervalMs: 25_000,
  rotationRetryMs: 5_000,
  reducedMotion: {
    speedFactor: 0.12,
    rollFactor: 0.2,
    slotFactor: 0.6,
  },
}
