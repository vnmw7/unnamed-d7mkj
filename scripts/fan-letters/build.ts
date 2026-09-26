import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import { join } from 'node:path'
import { packAtlasPages } from './atlas.ts'
import { shortHash } from './hash.ts'
import {
  buildIndex,
  buildPageManifest,
  readPreviousIndex,
  writeAssetIfChanged,
} from './manifest.ts'
import { normalizeLetter } from './normalize.ts'
import { renderTextCard } from './textCard.ts'

const defaultInDir = 'content/fan-letters/raw'
const defaultOutDir = 'experiences/2026/public/fan-letters'

function parseArgs(argv: string[]): {
  inDir: string
  outDir: string
} {
  let inDir = defaultInDir
  let outDir = defaultOutDir

  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--in') {
      inDir = argv[++index] ?? inDir
    }

    if (argv[index] === '--out') {
      outDir = argv[++index] ?? outDir
    }
  }

  return { inDir, outDir }
}

const imageExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.gif',
])

const { inDir, outDir } = parseArgs(process.argv.slice(2))

if (!existsSync(inDir)) {
  console.error(`Input directory not found: ${inDir}`)
  process.exit(1)
}

const entryNames = readdirSync(inDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => {
    if (name === 'authors.json') {
      return false
    }

    const extension = name
      .slice(name.lastIndexOf('.'))
      .toLowerCase()
    return (
      imageExtensions.has(extension) ||
      extension === '.txt'
    )
  })
  .sort()

if (entryNames.length === 0) {
  console.error(`No letters found in ${inDir}.`)
  process.exit(1)
}

const authorsPath = join(inDir, 'authors.json')
const authors: Record<string, string> = existsSync(
  authorsPath,
)
  ? JSON.parse(readFileSync(authorsPath, 'utf8'))
  : {}

const lettersById = new Map<
  string,
  Awaited<ReturnType<typeof normalizeLetter>>
>()

for (const name of entryNames) {
  const input = readFileSync(join(inDir, name))
  const id = shortHash(input)

  if (lettersById.has(id)) {
    console.log(
      `Skipping duplicate letter content: ${name} (${id})`,
    )
    continue
  }

  const isText = name
    .toLowerCase()
    .endsWith('.txt')
  const text = isText
    ? input.toString('utf8').trim()
    : ''

  if (isText && !text) {
    console.warn(`Skipping empty text letter: ${name}`)
    continue
  }

  const source = isText
    ? await renderTextCard(text)
    : input

  lettersById.set(
    id,
    await normalizeLetter(source, {
      id,
      kind: isText ? 'text' : 'image',
      author: authors[name],
    }),
  )
}

const letters = [...lettersById.values()]
const textCount = letters.filter(
  (letter) => letter.kind === 'text',
).length

console.log(
  `Normalized ${letters.length} letters (${textCount} text) from ${inDir}.`,
)

const atlasPages = await packAtlasPages(letters)
const pageManifests = atlasPages.map((page, index) =>
  buildPageManifest(page, index, letters),
)
const atlasHashes = atlasPages.map((page) =>
  shortHash(page.image),
)
const previousIndex = readPreviousIndex(outDir)
const { index: fanLetterIndex, indexPages } = buildIndex(
  pageManifests,
  atlasHashes,
  previousIndex,
)

const fullDir = join(outDir, 'full')
const atlasDir = join(outDir, 'atlases')
const pagesDir = join(outDir, 'pages')

mkdirSync(fullDir, { recursive: true })
mkdirSync(atlasDir, { recursive: true })
mkdirSync(pagesDir, { recursive: true })

let writtenCount = 0

for (const letter of letters) {
  if (
    writeAssetIfChanged(
      join(outDir, 'full', `${letter.id}.webp`),
      letter.full,
    )
  ) {
    writtenCount += 1
  }
}

pageManifests.forEach((manifest, pageIndex) => {
  if (
    writeAssetIfChanged(
      join(outDir, indexPages[pageIndex].atlasUrl),
      atlasPages[pageIndex].image,
    )
  ) {
    writtenCount += 1
  }

  if (
    writeAssetIfChanged(
      join(outDir, indexPages[pageIndex].manifestUrl),
      Buffer.from(JSON.stringify(manifest)),
    )
  ) {
    writtenCount += 1
  }
})

writeAssetIfChanged(
  join(outDir, 'index.json'),
  Buffer.from(JSON.stringify(fanLetterIndex)),
)

const totalBytes =
  letters.reduce((sum, letter) => sum + letter.full.length, 0) +
  atlasPages.reduce(
    (sum, page) => sum + page.image.length,
    0,
  )

console.log(
  `Wrote ${writtenCount} new/changed assets. ` +
    `Index: version ${fanLetterIndex.version}, ` +
    `${fanLetterIndex.totalLetters} letters across ${indexPages.length} pages ` +
    `(${(totalBytes / 1024 / 1024).toFixed(2)} MB) -> ${outDir}`,
)
