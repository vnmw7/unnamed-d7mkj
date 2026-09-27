import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

// Generates deterministic sample letters so the runtime can be developed
// and verified before real submissions exist. Refuses to touch an existing
// raw directory unless --force is passed, so real submissions are never
// clobbered.

const outputDir = 'content/fan-letters/raw'
const imageCount = 36

const palettes: Array<[string, string]> = [
  ['#f9dce4', '#c96f9b'],
  ['#dce9f9', '#6f8fc9'],
  ['#e4f9dc', '#6fc98f'],
  ['#f9f3dc', '#c9b36f'],
  ['#ecdcf9', '#9b6fc9'],
  ['#dcf3f9', '#6fb9c9'],
  ['#f9e0dc', '#c97f6f'],
  ['#e8ecdc', '#9ba36f'],
  ['#f3dcf1', '#c96fae'],
]

const authors = [
  'Hana',
  'Yuki',
  'Sora',
  'Mika',
  'Aoi',
  'Riko',
]

const textLetters = [
  {
    file: 'sample-letter-001.txt',
    author: 'Hana',
    text: 'Happy birthday, Moka!\n\nThank you for always making everyone smile.\nI hope this year brings you as much joy as you bring to us.\nHave a wonderful day filled with cake and cuddles.',
  },
  {
    file: 'sample-letter-002.txt',
    author: 'Yuki',
    text: 'モカちゃん、お誕生日おめでとうございます。\nいつも可愛い姿をありがとう。\nこれからもずっと元気で長生きしてくださいね。',
  },
  {
    file: 'sample-letter-003.txt',
    author: 'Sora',
    text: 'To the sweetest cat in the world: another year of naps, treats, and admirers.\nMay your bowl never be empty and your sunbeam always be warm.',
  },
]

function createRandom(seed: number): () => number {
  let state = (seed * 7919 + 13) >>> 0

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function postcardSvg(seed: number): string {
  const [background, accent] =
    palettes[seed % palettes.length]
  const random = createRandom(seed)

  let shapes = ''
  const shapeCount = 6 + Math.floor(random() * 5)

  for (let index = 0; index < shapeCount; index++) {
    const cx = 60 + random() * 480
    const cy = 60 + random() * 680
    const radius = 24 + random() * 90
    const opacity = (0.12 + random() * 0.25).toFixed(2)

    if (random() > 0.45) {
      shapes +=
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" ` +
        `r="${radius.toFixed(1)}" fill="${accent}" opacity="${opacity}"/>`
    } else {
      const size = radius * 1.4
      const rotation = (
        random() * 40 -
        20
      ).toFixed(1)

      shapes +=
        `<rect x="${(cx - size / 2).toFixed(1)}" y="${(cy - size / 2).toFixed(1)}" ` +
        `width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size / 5).toFixed(1)}" ` +
        `fill="${accent}" opacity="${opacity}" ` +
        `transform="rotate(${rotation} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">` +
    `<rect width="600" height="800" rx="16" fill="${background}"/>` +
    `<rect x="20" y="20" width="560" height="760" rx="12" ` +
    `fill="none" stroke="${accent}" stroke-opacity="0.35" stroke-width="3"/>` +
    shapes +
    `</svg>`
  )
}

const force = process.argv.includes('--force')

if (existsSync(outputDir) && !force) {
  console.error(
    `Refusing to overwrite ${outputDir}. Pass --force to replace sample content.`,
  )
  process.exit(1)
}

mkdirSync(outputDir, { recursive: true })

const authorMapping: Record<string, string> = {}

for (let index = 1; index <= imageCount; index++) {
  const name = `sample-postcard-${String(index).padStart(3, '0')}.webp`
  const svg = postcardSvg(index)
  const webp = await sharp(Buffer.from(svg))
    .webp({ quality: 82 })
    .toBuffer()

  writeFileSync(join(outputDir, name), webp)
  authorMapping[name] =
    authors[index % authors.length]
}

for (const letter of textLetters) {
  writeFileSync(
    join(outputDir, letter.file),
    letter.text,
  )
  authorMapping[letter.file] = letter.author
}

writeFileSync(
  join(outputDir, 'authors.json'),
  JSON.stringify(authorMapping, null, 2),
)

console.log(
  `Wrote ${imageCount} postcards and ${textLetters.length} text letters to ${outputDir}. ` +
    'Run `bun run fan-letters:build` to generate the atlas content.',
)
