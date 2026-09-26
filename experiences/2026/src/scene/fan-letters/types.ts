/**
 * UV rect convention: [uMin, vMin, uWidth, vHeight] in GL texture space.
 * v is measured from the bottom edge of the atlas (three keeps its default
 * `flipY = true` for atlas textures); the packer converts from image pixel
 * space, so runtime code never flips coordinates.
 */
export type UvRect = [number, number, number, number]

export type FanLetterKind = 'image' | 'text'

export interface FanLetterRecord {
  id: string
  uv: UvRect
  aspectRatio: number
  fullUrl: string
  author?: string
  kind: FanLetterKind
}

export interface FanLetterIndexPage {
  id: string
  count: number
  manifestUrl: string
  atlasUrl: string
}

export interface FanLetterIndex {
  version: number
  totalLetters: number
  pages: FanLetterIndexPage[]
}

export interface FanLetterPageManifest {
  id: string
  letters: FanLetterRecord[]
}

export interface OrbitSlot {
  phase: number
  radius: number
  height: number
  angularVelocity: number
  roll: number
  scale: number
}
