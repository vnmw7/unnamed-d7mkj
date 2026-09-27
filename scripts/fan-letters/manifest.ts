import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { shortHash } from './hash.ts'
import type { AtlasPage } from './atlas.ts'
import type { NormalizedLetter } from './normalize.ts'
import type {
  FanLetterIndex,
  FanLetterIndexPage,
  FanLetterPageManifest,
  FanLetterRecord,
} from '../../experiences/2026/src/scene/fan-letters/types.ts'

// The manifest schema is owned by the runtime's types.ts; the pipeline and
// the 2026 experience share this single definition.

export function pageIdFor(pageIndex: number): string {
  return `page-${String(pageIndex).padStart(3, '0')}`
}

export function buildPageManifest(
  page: AtlasPage,
  pageIndex: number,
  letters: NormalizedLetter[],
): FanLetterPageManifest {
  return {
    id: pageIdFor(pageIndex),
    letters: page.cells.map((cell) => {
      const letter = letters[cell.letterIndex]
      const record: FanLetterRecord = {
        id: letter.id,
        uv: cell.uv,
        aspectRatio: letter.aspectRatio,
        fullUrl: `full/${letter.id}.webp`,
        kind: letter.kind,
      }

      if (letter.author !== undefined) {
        record.author = letter.author
      }

      return record
    }),
  }
}

export function buildIndex(
  pageManifests: FanLetterPageManifest[],
  atlasHashes: string[],
  previous: FanLetterIndex | null,
): {
  index: FanLetterIndex
  indexPages: FanLetterIndexPage[]
} {
  const indexPages: FanLetterIndexPage[] =
    pageManifests.map((manifest, index) => ({
      id: manifest.id,
      count: manifest.letters.length,
      manifestUrl: `pages/${manifest.id}.${shortHash(
        JSON.stringify(manifest),
      )}.json`,
      atlasUrl: `atlases/${manifest.id}.${atlasHashes[index]}.webp`,
    }))

  const baseVersion = previous?.version ?? 0
  const unchanged =
    previous !== null &&
    JSON.stringify(previous.pages) ===
      JSON.stringify(indexPages)

  const index: FanLetterIndex = {
    version: unchanged
      ? baseVersion
      : baseVersion + 1,
    totalLetters: indexPages.reduce(
      (sum, page) => sum + page.count,
      0,
    ),
    pages: indexPages,
  }

  return { index, indexPages }
}

export function readPreviousIndex(
  outDir: string,
): FanLetterIndex | null {
  const indexPath = join(outDir, 'index.json')

  if (!existsSync(indexPath)) {
    return null
  }

  try {
    const existing = JSON.parse(
      readFileSync(indexPath, 'utf8'),
    ) as FanLetterIndex

    return typeof existing.version === 'number' &&
      Array.isArray(existing.pages)
      ? existing
      : null
  } catch {
    return null
  }
}

export function writeAssetIfChanged(
  filePath: string,
  data: Buffer,
): boolean {
  if (existsSync(filePath)) {
    if (readFileSync(filePath).equals(data)) {
      return false
    }
  }

  writeFileSync(filePath, data)
  return true
}
