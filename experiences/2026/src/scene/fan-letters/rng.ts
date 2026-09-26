export type RandomGenerator = () => number

export function createSeededRandom(seed: number): RandomGenerator {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0

    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled<T>(
  items: readonly T[],
  random: RandomGenerator,
): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [
      result[swapIndex],
      result[index],
    ]
  }

  return result
}

export function rangeBetween(
  random: RandomGenerator,
  min: number,
  max: number,
): number {
  return min + random() * (max - min)
}
