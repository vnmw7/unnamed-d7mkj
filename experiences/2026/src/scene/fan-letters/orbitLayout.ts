import { fanLetterConfig } from './config'
import {
  createSeededRandom,
  rangeBetween,
} from './rng'
import type { OrbitSlot } from './types'

const goldenAngle = 2.399963229728653

/**
 * Deterministic orbit slots: golden-angle phases with a small seeded
 * perturbation produce a loose band instead of a carousel or random
 * clustering. Slots are independent of which letters occupy them.
 */
export function createOrbitSlots(
  slotCount: number,
  seed: number,
): OrbitSlot[] {
  const random = createSeededRandom(seed)
  const slots: OrbitSlot[] = []
  const [radiusMin, radiusMax] = fanLetterConfig.radiusRange
  const [heightMin, heightMax] = fanLetterConfig.heightRange
  const [slotHeightMin, slotHeightMax] =
    fanLetterConfig.slotHeightRange
  const [speedMin, speedMax] = fanLetterConfig.speedJitter
  const bandWidth =
    (radiusMax - radiusMin) / fanLetterConfig.bandCount

  for (let index = 0; index < slotCount; index++) {
    const band = index % fanLetterConfig.bandCount
    const bandRadiusMin = radiusMin + band * bandWidth
    const radius = rangeBetween(
      random,
      bandRadiusMin,
      bandRadiusMin + bandWidth,
    )
    const phase =
      (index * goldenAngle +
        rangeBetween(random, -0.18, 0.18)) %
      (Math.PI * 2)
    const height = rangeBetween(random, heightMin, heightMax)
    const speedJitter = rangeBetween(random, speedMin, speedMax)
    const angularVelocity =
      fanLetterConfig.baseAngularSpeed *
      fanLetterConfig.bandSpeedFactors[band] *
      speedJitter
    const roll = rangeBetween(
      random,
      -fanLetterConfig.rollRange,
      fanLetterConfig.rollRange,
    )
    const scale = rangeBetween(
      random,
      slotHeightMin,
      slotHeightMax,
    )

    slots.push({
      phase,
      radius,
      height,
      angularVelocity,
      roll,
      scale,
    })
  }

  return slots
}
