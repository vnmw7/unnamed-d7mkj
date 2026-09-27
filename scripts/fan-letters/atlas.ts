import sharp from 'sharp'
import type { NormalizedLetter } from './normalize.ts'

export type UvRect = [number, number, number, number]

export interface PackedCell {
  letterIndex: number
  x: number
  y: number
  width: number
  height: number
  /**
   * [uMin, vMin, uWidth, vHeight] in GL texture space (v measured from the
   * bottom edge; the runtime samples with three's default flipY = true).
   */
  uv: UvRect
}

export interface AtlasPage {
  cells: PackedCell[]
  image: Buffer
}

const atlasSize = 1024
// Mirrored edge pixels around every cell: mipmaps and bilinear filtering
// bleed across cell borders, and the mirror kills the seams without
// changing what the UV rect samples.
const gutter = 8

interface CellSize {
  letterIndex: number
  width: number
  height: number
}

interface Placement {
  letterIndex: number
  x: number
  y: number
  width: number
  height: number
}

function packShelves(
  sizes: CellSize[],
): Placement[] {
  const placements: Placement[] = []
  let x = gutter
  let y = gutter
  let rowHeight = 0

  for (const size of sizes) {
    if (x + size.width + gutter > atlasSize) {
      x = gutter
      y += rowHeight + gutter
      rowHeight = 0
    }

    if (y + size.height + gutter > atlasSize) {
      break
    }

    placements.push({
      letterIndex: size.letterIndex,
      x,
      y,
      width: size.width,
      height: size.height,
    })

    x += size.width + gutter
    rowHeight = Math.max(rowHeight, size.height)
  }

  return placements
}

function toAtlasUv(cell: {
  x: number
  y: number
  width: number
  height: number
}): UvRect {
  return [
    cell.x / atlasSize,
    (atlasSize - cell.y - cell.height) / atlasSize,
    cell.width / atlasSize,
    cell.height / atlasSize,
  ]
}

/**
 * Packs letter previews into fixed-size atlas pages. Exact letters per page
 * come from the packer; runtime code never assumes a count. Deterministic
 * for a given input order (sorted by height, ties by original index).
 */
export async function packAtlasPages(
  letters: NormalizedLetter[],
): Promise<AtlasPage[]> {
  const sizes: CellSize[] = letters.map((letter, letterIndex) => ({
    letterIndex,
    width: letter.previewWidth,
    height: letter.previewHeight,
  }))

  sizes.sort(
    (a, b) =>
      b.height - a.height || a.letterIndex - b.letterIndex,
  )

  const pages: AtlasPage[] = []
  let queue = sizes

  while (queue.length > 0) {
    const placements = packShelves(queue)

    if (placements.length === 0) {
      throw new Error(
        'Letter preview does not fit into an empty atlas page.',
      )
    }

    const placedIndexes = new Set(
      placements.map((cell) => cell.letterIndex),
    )
    queue = queue.filter(
      (size) => !placedIndexes.has(size.letterIndex),
    )

    const composites = await Promise.all(
      placements.map(async (cell) => {
        const preview =
          letters[cell.letterIndex].preview
        const extended = await sharp(preview)
          .extend({
            top: gutter,
            bottom: gutter,
            left: gutter,
            right: gutter,
            extendWith: 'mirror',
          })
          .png()
          .toBuffer()

        return {
          input: extended,
          left: cell.x - gutter,
          top: cell.y - gutter,
        }
      }),
    )

    const image = await sharp({
      create: {
        width: atlasSize,
        height: atlasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .webp({ quality: 85, alphaQuality: 90 })
      .toBuffer()

    pages.push({
      cells: placements.map((cell) => ({
        ...cell,
        uv: toAtlasUv(cell),
      })),
      image,
    })
  }

  return pages
}
