import sharp from 'sharp'

export interface NormalizedLetter {
  id: string
  kind: 'image' | 'text'
  author?: string
  /** Full display asset, long edge capped, WebP. */
  full: Buffer
  /** Orbit preview packed into atlas pages, long edge capped, PNG. */
  preview: Buffer
  previewWidth: number
  previewHeight: number
  aspectRatio: number
}

export interface LetterMeta {
  id: string
  kind: 'image' | 'text'
  author?: string
}

const fullLongEdge = 1600
const previewLongEdge = 256

export async function normalizeLetter(
  input: Buffer,
  meta: LetterMeta,
): Promise<NormalizedLetter> {
  // rotate() with no arguments applies EXIF orientation automatically.
  const source = sharp(input, { failOn: 'none' }).rotate()

  const full = await source
    .clone()
    .resize({
      width: fullLongEdge,
      height: fullLongEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer()

  const preview = await source
    .clone()
    .resize({
      width: previewLongEdge,
      height: previewLongEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer()

  const previewMeta = await sharp(preview).metadata()
  const width = previewMeta.width ?? previewLongEdge
  const height = previewMeta.height ?? previewLongEdge

  return {
    ...meta,
    full,
    preview,
    previewWidth: width,
    previewHeight: height,
    aspectRatio: width / height,
  }
}
