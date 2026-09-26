import { deviceClass, fanLetterConfig } from './config'
import {
  createSeededRandom,
  shuffled,
  type RandomGenerator,
} from './rng'
import type {
  FanLetterIndex,
  FanLetterIndexPage,
  OrbitSlot,
} from './types'

export interface SlotAssignment {
  pageId: string
  letterIndex: number
}

export interface PageLayoutEntry {
  slotIndex: number
  letterIndex: number
}

interface PendingSwap {
  slotIndex: number
  previousPageId: string | null
  nextPageId: string | null
  nextLetterIndex: number
  startedAt: number
  phase: 'out' | 'in'
}

interface PendingRelease {
  pageId: string
  remaining: number
}

export interface SchedulerCallbacks {
  acquirePage: (page: FanLetterIndexPage) => Promise<unknown>
  releasePage: (pageId: string) => void
}

const clamp01 = (value: number) =>
  Math.min(1, Math.max(0, value))

/**
 * Decides which atlas pages are active and which letter occupies each orbit
 * slot. Pages are scheduled (not individual letters) so textures and draw
 * calls stay bounded; letters rotate through stable slots with fade
 * transitions. Page order comes from a seeded shuffled queue.
 */
export class OrbitScheduler {
  private readonly pageById = new Map<
    string,
    FanLetterIndexPage
  >()
  private readonly slots: OrbitSlot[]
  private readonly callbacks: SchedulerCallbacks
  private readonly random: RandomGenerator
  private readonly assignments: (SlotAssignment | null)[]
  private readonly opacities: Float32Array
  private queue: string[]
  private readonly activeIds: string[] = []
  private readonly cursors = new Map<string, number>()
  private pendingSwaps: PendingSwap[] = []
  private pendingReleases: PendingRelease[] = []
  private queueTail = 0
  private roundRobinIndex = 0
  private nextRotationAt = 0
  private rotating = false

  constructor(
    index: FanLetterIndex,
    slots: OrbitSlot[],
    callbacks: SchedulerCallbacks,
    seed: number,
  ) {
    this.slots = slots
    this.callbacks = callbacks
    this.random = createSeededRandom(seed ^ 0x9e3779b9)

    for (const page of index.pages) {
      this.pageById.set(page.id, page)
    }

    this.queue = shuffled(
      index.pages.map((page) => page.id),
      createSeededRandom(seed),
    )
    this.assignments = new Array(slots.length).fill(null)
    this.opacities = new Float32Array(slots.length)

    const activeCount = this.resolveActivePageCount(index)
    this.activeIds.push(...this.queue.slice(0, activeCount))
    this.queueTail = activeCount

    this.fillAssignments()
  }

  /**
   * Starts the entrance fade cascade. Call once the initial atlas pages are
   * resident and their batches have mounted.
   */
  begin(nowMs: number): void {
    let staggerIndex = 0

    for (let slotIndex = 0; slotIndex < this.assignments.length; slotIndex++) {
      if (!this.assignments[slotIndex]) {
        continue
      }

      this.pendingSwaps.push({
        slotIndex,
        previousPageId: null,
        nextPageId: null,
        nextLetterIndex: -1,
        startedAt: nowMs + staggerIndex * 24,
        phase: 'in',
      })
      staggerIndex += 1
    }

    this.nextRotationAt =
      nowMs + fanLetterConfig.rotationIntervalMs
  }

  getActivePageIds(): string[] {
    return [...this.activeIds]
  }

  getOpacity(slotIndex: number): number {
    return this.opacities[slotIndex]
  }

  getAssignmentsForPage(
    pageId: string,
  ): PageLayoutEntry[] {
    const layout: PageLayoutEntry[] = []

    for (
      let slotIndex = 0;
      slotIndex < this.assignments.length;
      slotIndex++
    ) {
      const assignment = this.assignments[slotIndex]

      if (assignment?.pageId === pageId) {
        layout.push({
          slotIndex,
          letterIndex: assignment.letterIndex,
        })
      }
    }

    return layout
  }

  hasActiveFades(): boolean {
    return this.pendingSwaps.length > 0
  }

  /**
   * Advances fade transitions and the page rotation timer. Returns true
   * when any slot's assignment changed (batches must rewrite their UV
   * rects).
   */
  tick(nowMs: number): boolean {
    let dirty = false
    const duration = fanLetterConfig.fadeDurationMs

    this.pendingSwaps = this.pendingSwaps.filter((swap) => {
      const elapsed = nowMs - swap.startedAt

      if (swap.phase === 'out') {
        this.opacities[swap.slotIndex] =
          1 - clamp01(elapsed / duration)

        if (elapsed < duration) {
          return true
        }

        this.assignments[swap.slotIndex] = swap.nextPageId
          ? {
              pageId: swap.nextPageId,
              letterIndex: swap.nextLetterIndex,
            }
          : null
        dirty = true
        this.settleRelease(swap.previousPageId)

        swap.phase = 'in'
        swap.startedAt = nowMs
        return true
      }

      this.opacities[swap.slotIndex] = clamp01(
        elapsed / duration,
      )

      return elapsed < duration
    })

    if (
      !this.rotating &&
      nowMs >= this.nextRotationAt &&
      this.canRotate()
    ) {
      void this.startRotation(nowMs)
    }

    return dirty
  }

  private resolveActivePageCount(
    index: FanLetterIndex,
  ): number {
    const totalLetters =
      index.totalLetters ||
      index.pages.reduce(
        (sum, page) => sum + page.count,
        0,
      )
    const avgPerPage = Math.max(
      1,
      Math.ceil(totalLetters / index.pages.length),
    )
    const needed = Math.ceil(this.slots.length / avgPerPage)

    return Math.max(
      1,
      Math.min(
        index.pages.length,
        fanLetterConfig.maxActivePages[deviceClass],
        needed,
      ),
    )
  }

  private fillAssignments(): void {
    for (
      let slotIndex = 0;
      slotIndex < this.assignments.length;
      slotIndex++
    ) {
      const assignment = this.takeNextLetter()

      if (!assignment) {
        break
      }

      this.assignments[slotIndex] = assignment
    }
  }

  private takeNextLetter(): SlotAssignment | null {
    for (let attempt = 0; attempt < this.activeIds.length; attempt++) {
      const pageId =
        this.activeIds[
          this.roundRobinIndex % this.activeIds.length
        ]
      this.roundRobinIndex += 1
      const letterIndex = this.reserveLetter(pageId)

      if (letterIndex !== null) {
        return { pageId, letterIndex }
      }
    }

    return null
  }

  private reserveLetter(pageId: string): number | null {
    const page = this.pageById.get(pageId)
    const cursor = this.cursors.get(pageId) ?? 0

    if (!page || cursor >= page.count) {
      return null
    }

    this.cursors.set(pageId, cursor + 1)
    return cursor
  }

  private canRotate(): boolean {
    return this.pages.length > this.activeIds.length
  }

  private get pages(): FanLetterIndexPage[] {
    return [...this.pageById.values()]
  }

  private async startRotation(nowMs: number): Promise<void> {
    this.rotating = true

    try {
      const outPageId = this.activeIds[0]
      const inPageId = this.takeNextQueuedPageId()

      if (!inPageId || inPageId === outPageId) {
        this.nextRotationAt =
          nowMs + fanLetterConfig.rotationIntervalMs
        return
      }

      try {
        await this.callbacks.acquirePage(
          this.pageById.get(inPageId)!,
        )
      } catch (error) {
        console.warn(
          `Failed to preload page ${inPageId}, retrying later:`,
          error,
        )
        this.nextRotationAt =
          nowMs + fanLetterConfig.rotationRetryMs
        return
      }

      const swapSlots: number[] = []

      for (
        let slotIndex = 0;
        slotIndex < this.assignments.length;
        slotIndex++
      ) {
        if (this.assignments[slotIndex]?.pageId === outPageId) {
          swapSlots.push(slotIndex)
        }
      }

      const pendingRelease: PendingRelease = {
        pageId: outPageId,
        remaining: swapSlots.length,
      }
      this.pendingReleases.push(pendingRelease)

      swapSlots.forEach((slotIndex, order) => {
        const letterIndex = this.reserveLetter(inPageId)

        this.pendingSwaps.push({
          slotIndex,
          previousPageId: outPageId,
          nextPageId: letterIndex === null ? null : inPageId,
          nextLetterIndex: letterIndex ?? -1,
          startedAt: nowMs + order * 40,
          phase: 'out',
        })
      })

      const outIndex = this.activeIds.indexOf(outPageId)
      this.activeIds.splice(outIndex, 1)
      this.activeIds.push(inPageId)
      this.nextRotationAt =
        nowMs + fanLetterConfig.rotationIntervalMs
    } finally {
      this.rotating = false
    }
  }

  private takeNextQueuedPageId(): string | null {
    if (this.queueTail >= this.queue.length) {
      const next = shuffled(
        this.pages.map((page) => page.id),
        this.random,
      )
      const activeSet = new Set(this.activeIds)

      this.queue = [
        ...next.filter((id) => !activeSet.has(id)),
        ...next.filter((id) => activeSet.has(id)),
      ]
      this.queueTail = 0
    }

    return this.queue[this.queueTail++] ?? null
  }

  private settleRelease(pageId: string | null): void {
    if (!pageId) {
      return
    }

    const release = this.pendingReleases.find(
      (candidate) => candidate.pageId === pageId,
    )

    if (!release) {
      return
    }

    release.remaining -= 1

    if (release.remaining <= 0) {
      this.pendingReleases = this.pendingReleases.filter(
        (candidate) => candidate !== release,
      )
      this.callbacks.releasePage(pageId)
    }
  }
}
