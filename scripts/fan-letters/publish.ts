import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import { join } from 'node:path'
import { AwsClient } from 'aws4fetch'

// Uploads a built fan-letter directory to R2 over the S3 API.
// Assets are content-addressed and immutable, so they are uploaded with a
// one-year immutable cache policy; the root index is uploaded LAST with a
// short TTL, which makes publication effectively atomic.

const defaultOutDir = 'experiences/2026/public/fan-letters'

function parseArgs(argv: string[]): {
  outDir: string
  execute: boolean
} {
  let outDir = defaultOutDir

  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--out') {
      outDir = argv[++index] ?? outDir
    }
  }

  return { outDir, execute: argv.includes('--execute') }
}

function collectFiles(
  dir: string,
  baseDir: string = dir,
): string[] {
  const files: string[] = []

  for (const entry of readdirSync(dir, {
    withFileTypes: true,
  })) {
    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir))
    } else {
      const relativePath = fullPath
        .slice(baseDir.length + 1)
        .replaceAll('\\', '/')
      files.push(relativePath)
    }
  }

  return files
}

function contentTypeFor(key: string): string {
  if (key.endsWith('.json')) {
    return 'application/json'
  }

  if (key.endsWith('.webp')) {
    return 'image/webp'
  }

  if (key.endsWith('.png')) {
    return 'image/png'
  }

  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) {
    return 'image/jpeg'
  }

  return 'application/octet-stream'
}

const { outDir, execute } = parseArgs(process.argv.slice(2))

if (!existsSync(outDir)) {
  console.error(
    `Nothing to publish: ${outDir} does not exist. Run the build first.`,
  )
  process.exit(1)
}

const requiredEnv = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
] as const

const missingEnv = requiredEnv.filter(
  (name) => !process.env[name],
)

if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(', ')}`,
  )
  process.exit(1)
}

const accountId = process.env.R2_ACCOUNT_ID!
const bucket = process.env.R2_BUCKET!
const keyPrefix = (process.env.R2_KEY_PREFIX ?? '')
  .replace(/^\/+|\/+$/g, '')

const files = collectFiles(outDir)

if (!files.includes('index.json')) {
  console.error(
    `No index.json found in ${outDir}; refusing to publish a partial build.`,
  )
  process.exit(1)
}

// Everything before the index; the index itself goes last.
const uploadOrder = [
  ...files
    .filter((file) => file !== 'index.json')
    .sort(),
  'index.json',
]

if (!execute) {
  console.log(
    `Dry run for ${uploadOrder.length} objects under ` +
      `${bucket}/${keyPrefix || '(bucket root)'}:`,
  )

  for (const key of uploadOrder) {
    const suffix =
      key === 'index.json'
        ? ' [short TTL, uploaded last]'
        : ''
    console.log(`  ${key}${suffix}`)
  }

  console.log('Pass --execute to upload.')
  process.exit(0)
}

const client = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  service: 's3',
  region: 'auto',
})

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
let failed = 0

for (const key of uploadOrder) {
  const objectKey = keyPrefix
    ? `${keyPrefix}/${key}`
    : key
  const url = `${endpoint}/${bucket}/${objectKey}`
  const body = readFileSync(join(outDir, key))
  const cacheControl =
    key === 'index.json'
      ? 'public, max-age=60, stale-while-revalidate=300'
      : 'public, max-age=31536000, immutable'

  const response = await client.fetch(url, {
    method: 'PUT',
    body,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': contentTypeFor(key),
    },
  })

  if (!response.ok) {
    failed += 1
    console.error(
      `Failed to upload ${key}: ${response.status}`,
      await response.text(),
    )
  } else {
    console.log(
      `Uploaded ${key} (${body.length} bytes)${key === 'index.json' ? ' — publication complete' : ''}`,
    )
  }
}

if (failed > 0) {
  console.error(`${failed} upload(s) failed.`)
  process.exit(1)
}
