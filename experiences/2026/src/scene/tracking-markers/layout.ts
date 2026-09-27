export type MarkerWall = 'front' | 'back' | 'left' | 'right'

/**
 * Physical spec of the tracking markers. Every marker shares one size and
 * orientation so they read as standardized equipment, with perspective
 * alone providing apparent size differences. Tune these values (not the
 * rendering code) when the marks feel too prominent or too subtle.
 */
export const TRACKING_MARKER = {
  size: 0.18,
  thickness: 0.026,
  wallInset: 0.006,
  color: '#111111',
} as const

export interface MarkerPlacement {
  wall: MarkerWall
  /** Horizontal position along the wall, in meters from wall center. */
  u: number
  /** Height above the floor, in meters. */
  y: number
}

/**
 * Hand-authored marker placements — the tuning surface for the room's
 * composition. Positions are deliberately asymmetric; every marker shares
 * one size and orientation so they read as installed tracking equipment,
 * with perspective alone providing apparent size differences.
 */
export const MARKER_LAYOUT: readonly MarkerPlacement[] = [
  // Front
  { wall: 'front', u: -4.45, y: 3.85 },
  { wall: 'front', u: -2.85, y: 1.18 },
  { wall: 'front', u: -0.3, y: 2.55 },
  { wall: 'front', u: 2.75, y: 3.62 },
  { wall: 'front', u: 4.25, y: 1.05 },

  // Back
  { wall: 'back', u: -4.2, y: 1.05 },
  { wall: 'back', u: -2.65, y: 3.55 },
  { wall: 'back', u: 0.55, y: 2.3 },
  { wall: 'back', u: 2.9, y: 1.35 },
  { wall: 'back', u: 4.25, y: 3.9 },

  // Left
  { wall: 'left', u: -4.6, y: 3.9 },
  { wall: 'left', u: -2.0, y: 2.4 },
  { wall: 'left', u: 0.75, y: 1.05 },
  { wall: 'left', u: 3.55, y: 3.2 },

  // Right
  { wall: 'right', u: -4.35, y: 1.05 },
  { wall: 'right', u: -1.75, y: 3.75 },
  { wall: 'right', u: 1.25, y: 2.35 },
  { wall: 'right', u: 4.15, y: 3.9 },
]
