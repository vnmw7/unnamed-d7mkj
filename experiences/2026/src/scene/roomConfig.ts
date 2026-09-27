const roomSize = {
  width: 12,
  depth: 12,
  height: 5,
} as const

/**
 * Single source of truth for the room shell: walls sit at +/- halfWidth
 * (x) and +/- halfDepth (z), the floor is y = 0 and the ceiling is
 * y = height. Anything placed relative to the room (tracking markers,
 * fan-letter orbit bounds, future props) should consume these values.
 */
export const ROOM = {
  ...roomSize,
  halfWidth: roomSize.width / 2,
  halfDepth: roomSize.depth / 2,
  halfHeight: roomSize.height / 2,
} as const
