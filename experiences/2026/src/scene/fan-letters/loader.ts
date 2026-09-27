import type {
  FanLetterIndex,
  FanLetterPageManifest,
} from './types'
import { fanLetterConfig } from './config'

export function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${fanLetterConfig.baseUrl}/${path.replace(/^\/+/, '')}`
}

let indexPromise: Promise<FanLetterIndex | null> | null = null

/**
 * Fetches the root fan-letter index once per session. Call it early (intro
 * screen) so the orbit can start loading pages before the user enters.
 * A missing index (404) is a normal state before content is published and
 * resolves to null; other failures warn once and also resolve to null so
 * the experience works without letters.
 */
export function loadFanLetterIndex(): Promise<FanLetterIndex | null> {
  indexPromise ??= fetch(resolveUrl('index.json'))
    .then(async (response) => {
      if (response.status === 404) {
        return null
      }

      if (!response.ok) {
        console.warn(
          `Fan letter index request failed: ${response.status}`,
        )
        return null
      }

      return (await response.json()) as FanLetterIndex
    })
    .catch((error) => {
      console.warn('Fan letter index unavailable:', error)
      return null
    })

  return indexPromise
}

const manifestPromises = new Map<
  string,
  Promise<FanLetterPageManifest>
>()

export function loadPageManifest(
  url: string,
): Promise<FanLetterPageManifest> {
  let manifestPromise = manifestPromises.get(url)

  manifestPromise ??= fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(
        `Page manifest request failed: ${response.status}`,
      )
    }

    return (await response.json()) as FanLetterPageManifest
  })

  manifestPromises.set(url, manifestPromise)

  return manifestPromise
}
