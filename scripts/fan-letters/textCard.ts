import sharp from 'sharp'

const cardWidth = 900
const cardHeight = 1200
const padding = 96
const fontSizes = [44, 38, 32]
const lineHeightRatio = 1.45
const paperColor = '#fdf7ee'
const inkColor = '#4a3f3a'
const border = { inset: 28, color: '#e3d3c2' }
// Code points at or above this are treated as full-width (CJK) glyphs.
const fullWidthCodePoint = 0x2e80

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function estimateWidth(
  text: string,
  fontSize: number,
): number {
  let total = 0

  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    total +=
      codePoint >= fullWidthCodePoint
        ? fontSize
        : fontSize * 0.55
  }

  return total
}

interface WrapState {
  lines: string[]
  current: string
}

function pushLine(
  state: WrapState,
  line: string,
): void {
  state.lines.push(line)
}

function pushWord(
  word: string,
  fontSize: number,
  maxWidth: number,
  state: WrapState,
): void {
  const append = (next: string) => {
    const candidate = state.current
      ? `${state.current} ${next}`
      : next

    if (estimateWidth(candidate, fontSize) <= maxWidth) {
      state.current = candidate
    } else {
      if (state.current) {
        pushLine(state, state.current)
      }

      state.current = next
    }
  }

  if (estimateWidth(word, fontSize) <= maxWidth) {
    append(word)
    return
  }

  let remaining = word

  while (estimateWidth(remaining, fontSize) > maxWidth) {
    let takeCount = 1

    while (
      takeCount < remaining.length &&
      estimateWidth(
        remaining.slice(0, takeCount + 1),
        fontSize,
      ) <= maxWidth
    ) {
      takeCount += 1
    }

    if (state.current) {
      pushLine(state, state.current)
      state.current = ''
    }

    pushLine(state, remaining.slice(0, takeCount))
    remaining = remaining.slice(takeCount)
  }

  if (remaining) {
    append(remaining)
  }
}

function wrapText(
  text: string,
  fontSize: number,
): string[] {
  const maxWidth = cardWidth - padding * 2
  const state: WrapState = { lines: [], current: '' }

  for (const paragraph of text
    .replace(/\r\n/g, '\n')
    .split('\n')) {
    if (!paragraph.trim()) {
      if (state.current) {
        pushLine(state, state.current)
        state.current = ''
      }

      pushLine(state, '')
      continue
    }

    for (const word of paragraph.split(/\s+/)) {
      pushWord(word, fontSize, maxWidth, state)
    }

    if (state.current) {
      pushLine(state, state.current)
      state.current = ''
    }
  }

  return state.lines
}

/**
 * Rasterizes a text submission into a card image so text letters flow
 * through the same atlas/full-asset pipeline as image letters. Rendered
 * from SVG via sharp, so no browser canvas is involved.
 */
export async function renderTextCard(
  text: string,
): Promise<Buffer> {
  const maxLinesFor = (fontSize: number) =>
    Math.floor(
      (cardHeight - padding * 2) /
        (fontSize * lineHeightRatio),
    )

  let fontSize = fontSizes[0]
  let lines = wrapText(text, fontSize)

  for (const candidate of fontSizes) {
    fontSize = candidate
    lines = wrapText(text, fontSize)

    if (lines.length <= maxLinesFor(fontSize)) {
      break
    }
  }

  const limit = maxLinesFor(fontSize)

  if (lines.length > limit) {
    lines = lines.slice(0, limit)
    const last = lines[limit - 1]
    lines[limit - 1] =
      last.length > 1 ? `${last.slice(0, -1)}…` : '…'
  }

  const lineHeight = fontSize * lineHeightRatio
  const firstBaseline = padding + fontSize * 0.9

  const tspans = lines
    .map(
      (line, index) =>
        `<tspan x="${padding}" dy="${
          index === 0 ? firstBaseline : lineHeight
        }">${escapeXml(line)}</tspan>`,
    )
    .join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${cardWidth}" height="${cardHeight}">` +
    `<rect width="${cardWidth}" height="${cardHeight}" rx="18" fill="${paperColor}"/>` +
    `<rect x="${border.inset}" y="${border.inset}" ` +
    `width="${cardWidth - border.inset * 2}" height="${cardHeight - border.inset * 2}" ` +
    `rx="12" fill="none" stroke="${border.color}" stroke-width="2"/>` +
    `<text font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" fill="${inkColor}">${tspans}</text>` +
    `</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}
