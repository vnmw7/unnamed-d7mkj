import { SRGBColorSpace, TextureLoader, type Texture } from 'three'
import type {
  FanLetterIndexPage,
  FanLetterPageManifest,
} from './types'
import { loadPageManifest, resolveUrl } from './loader'

export interface AtlasEntry {
  pageId: string
  texture: Texture
  manifest: FanLetterPageManifest
}

interface CacheRecord {
  promise: Promise<AtlasEntry>
  entry?: AtlasEntry
  refs: number
  lastUsed: number
}

function loadAtlasTexture(url: string): Promise<Texture> {
  const texture = new TextureLoader().loadAsync(url)
  texture.then((loaded) => {
    loaded.colorSpace = SRGBColorSpace
    loaded.anisotropy = 4
  })
  return texture
}

/**
 * LRU cache over resident atlas pages. Textures are disposed explicitly on
 * eviction — GPU memory is never left to garbage collection.
 */
export class AtlasCache {
  private readonly records = new Map<string, CacheRecord>()
  private readonly maxResident: number

  constructor(maxResident: number) {
    this.maxResident = maxResident
  }

  async acquire(page: FanLetterIndexPage): Promise<AtlasEntry> {
    const existing = this.records.get(page.id)

    if (existing) {
      existing.refs += 1
      existing.lastUsed = performance.now()
      return existing.promise
    }

    const record: CacheRecord = {
      promise: this.load(page),
      refs: 1,
      lastUsed: performance.now(),
    }

    this.records.set(page.id, record)

    try {
      const entry = await record.promise
      record.entry = entry
      this.evictIfNeeded()
      return entry
    } catch (error) {
      this.records.delete(page.id)
      throw error
    }
  }

  get(pageId: string): AtlasEntry | undefined {
    return this.records.get(pageId)?.entry
  }

  release(pageId: string): void {
    const record = this.records.get(pageId)

    if (record) {
      record.refs = Math.max(0, record.refs - 1)
      record.lastUsed = performance.now()
    }
  }

  get residentCount(): number {
    return this.records.size
  }

  disposeAll(): void {
    for (const record of this.records.values()) {
      record.entry?.texture.dispose()
    }

    this.records.clear()
  }

  private async load(
    page: FanLetterIndexPage,
  ): Promise<AtlasEntry> {
    const [manifest, texture] = await Promise.all([
      loadPageManifest(resolveUrl(page.manifestUrl)),
      loadAtlasTexture(resolveUrl(page.atlasUrl)),
    ])

    return { pageId: page.id, texture, manifest }
  }

  private evictIfNeeded(): void {
    const evictable = [...this.records.values()]
      .filter((record) => record.refs === 0 && record.entry)
      .sort((a, b) => a.lastUsed - b.lastUsed)

    let excess = this.records.size - this.maxResident

    for (const record of evictable) {
      if (excess <= 0) {
        break
      }

      this.records.delete(record.entry!.pageId)
      record.entry!.texture.dispose()
      excess -= 1
    }
  }
}
