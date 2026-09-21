import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { $ } from 'bun'

const distRoot = 'dist'

// Each edition builds in isolation into its own dist and is copied into the
// assembled site afterwards, so no two Vite processes ever share an output folder.
const editionYears = ['2026']

function copyBuildOutput(sourceDir: string, destinationDir: string): void {
  if (!existsSync(sourceDir)) {
    throw new Error(`Build output not found at ${sourceDir}.`)
  }

  // cpSync creates the destination itself but fails if its parent is missing.
  const parentDir = dirname(destinationDir)
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true })
  }
  cpSync(sourceDir, destinationDir, { recursive: true })
}

rmSync(distRoot, { recursive: true, force: true })

await $`cd apps/hub && bun run build`
copyBuildOutput('apps/hub/dist', distRoot)

for (const year of editionYears) {
  await $`cd experiences/${year} && bun run build`
  copyBuildOutput(`experiences/${year}/dist`, `${distRoot}/${year}`)
}

console.log(`Assembled site into ${distRoot}/`)
