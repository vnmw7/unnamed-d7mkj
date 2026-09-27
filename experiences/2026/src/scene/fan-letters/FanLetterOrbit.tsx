import { useFrame, useThree } from '@react-three/fiber'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  InstancedBufferAttribute,
  Object3D,
  PlaneGeometry,
  Raycaster,
  Vector2,
  type Camera,
  type InstancedMesh,
  type Texture,
} from 'three'
import { AtlasCache } from './atlasCache'
import {
  debugSpeedFactor,
  deviceClass,
  fanLetterConfig,
  prefersReducedMotion,
} from './config'
import { FanLetterAtlasBatch } from './FanLetterAtlasBatch'
import { loadFanLetterIndex } from './loader'
import { createOrbitSlots } from './orbitLayout'
import {
  OrbitScheduler,
  type PageLayoutEntry,
} from './scheduler'
import type {
  FanLetterPageManifest,
  FanLetterRecord,
} from './types'

interface FanLetterOrbitProps {
  paused: boolean
  onLetterSelected?: (record: FanLetterRecord) => void
  registerTapHandler?: (
    handler: ((clientX: number, clientY: number) => void) | null,
  ) => void
}

interface ActivePageState {
  pageId: string
  manifest: FanLetterPageManifest
  texture: Texture
}

interface BatchHandle {
  mesh: InstancedMesh
  layout: PageLayoutEntry[]
  aspectRatios: number[]
}

interface OrbitRuntime {
  scheduler: OrbitScheduler
  cache: AtlasCache
  slots: ReturnType<typeof createOrbitSlots>
  orbitTime: number
  geometry: PlaneGeometry
  registry: Map<string, BatchHandle>
}

const dummy = new Object3D()

function resolveSeed(): number {
  const seedParam = new URLSearchParams(
    window.location.search,
  ).get('lettersSeed')
  const parsed = seedParam
    ? Number.parseInt(seedParam, 10)
    : Number.NaN

  return Number.isNaN(parsed)
    ? Math.floor(Math.random() * 0xffffffff)
    : parsed >>> 0
}

/**
 * High-level orchestration of the floating fan-letter exhibition: loads the
 * index, runs the scheduler, mounts one atlas batch per active page, and
 * animates every active instance from a single useFrame. The archive can
 * grow without bound — only the configured active pages and slots are ever
 * resident.
 */
export function FanLetterOrbit({
  paused,
  onLetterSelected,
  registerTapHandler,
}: FanLetterOrbitProps) {
  const { camera, gl } = useThree()
  const [activePages, setActivePages] = useState<
    ActivePageState[]
  >([])
  const [geometry, setGeometry] =
    useState<PlaneGeometry | null>(null)
  const runtimeRef = useRef<OrbitRuntime | null>(null)
  const entryStoreRef = useRef(
    new Map<string, ActivePageState>(),
  )
  const activeSignatureRef = useRef('')
  const pausedRef = useRef(paused)
  const onLetterSelectedRef = useRef(onLetterSelected)
  const debugPanelRef = useRef<HTMLDivElement | null>(null)
  const debugLastUpdateRef = useRef(0)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    onLetterSelectedRef.current = onLetterSelected
  }, [onLetterSelected])

  const debugEnabled = useMemo(
    () =>
      new URLSearchParams(window.location.search).has(
        'lettersDebug',
      ),
    [],
  )

  useEffect(() => {
    let cancelled = false
    let loadedCache: AtlasCache | null = null
    let loadedGeometry: PlaneGeometry | null = null

    void loadFanLetterIndex().then(async (index) => {
      if (cancelled || !index || index.pages.length === 0) {
        return
      }

      const seed = resolveSeed()
      const slotTarget =
        fanLetterConfig.activeSlots[deviceClass]
      const slotCount = Math.round(
        slotTarget *
          (prefersReducedMotion
            ? fanLetterConfig.reducedMotion.slotFactor
            : 1),
      )
      const slots = createOrbitSlots(slotCount, seed)
      const cache = new AtlasCache(
        fanLetterConfig.maxResidentPages[deviceClass],
      )
      loadedCache = cache
      const orbitGeometry = new PlaneGeometry(1, 1)
      loadedGeometry = orbitGeometry

      const scheduler = new OrbitScheduler(
        index,
        slots,
        {
          acquirePage: async (page) => {
            const entry = await cache.acquire(page)
            entryStoreRef.current.set(page.id, {
              pageId: page.id,
              manifest: entry.manifest,
              texture: entry.texture,
            })
          },
          releasePage: (pageId) => {
            cache.release(pageId)
          },
        },
        seed,
      )

      runtimeRef.current = {
        scheduler,
        cache,
        slots,
        orbitTime: 0,
        geometry: orbitGeometry,
        registry: new Map(),
      }

      try {
        const initial = await Promise.all(
          scheduler
            .getActivePageIds()
            .map(async (pageId) => {
              const page = index.pages.find(
                (candidate) => candidate.id === pageId,
              )!
              const entry = await cache.acquire(page)
              const state: ActivePageState = {
                pageId,
                manifest: entry.manifest,
                texture: entry.texture,
              }
              entryStoreRef.current.set(pageId, state)
              return state
            }),
        )

        if (cancelled) {
          return
        }

        setGeometry(orbitGeometry)
        setActivePages(initial)
        scheduler.begin(performance.now())
      } catch (error) {
        console.warn('Fan letters failed to load:', error)
      }
    })

    return () => {
      cancelled = true
      runtimeRef.current = null
      loadedCache?.disposeAll()
      loadedGeometry?.dispose()
    }
  }, [])

  const registerMesh = useCallback(
    (pageId: string, mesh: InstancedMesh | null) => {
      const runtime = runtimeRef.current

      if (!runtime) {
        return
      }

      if (mesh) {
        const handle: BatchHandle = {
          mesh,
          layout: [],
          aspectRatios: [],
        }
        runtime.registry.set(pageId, handle)
        refreshHandle(runtime, pageId, handle)
      } else {
        runtime.registry.delete(pageId)
      }
    },
    [],
  )

  function refreshHandle(
    runtime: OrbitRuntime,
    pageId: string,
    handle: BatchHandle,
  ) {
    const layout = runtime.scheduler.getAssignmentsForPage(
      pageId,
    )
    handle.layout = layout
    const state = entryStoreRef.current.get(pageId)

    if (!state) {
      return
    }

    const uvRects = handle.mesh.geometry.getAttribute(
      'aUvRect',
    ) as InstancedBufferAttribute

    layout.forEach((entry, index) => {
      const letter =
        state.manifest.letters[entry.letterIndex]
      handle.aspectRatios[index] = letter.aspectRatio
      uvRects.set(letter.uv, index * 4)
    })

    uvRects.needsUpdate = true
  }

  function reconcileActivePages(runtime: OrbitRuntime) {
    const activeIds = runtime.scheduler.getActivePageIds()
    const signature = activeIds.join(',')

    if (signature === activeSignatureRef.current) {
      return
    }

    const missing = activeIds.some(
      (pageId) => !entryStoreRef.current.has(pageId),
    )

    if (missing) {
      return
    }

    activeSignatureRef.current = signature
    setActivePages(
      activeIds.map(
        (pageId) => entryStoreRef.current.get(pageId)!,
      ),
    )
  }

  useEffect(() => {
    if (!debugEnabled) {
      return
    }

    const panel = document.createElement('div')
    panel.className = 'letters-debug'
    document.body.appendChild(panel)
    debugPanelRef.current = panel

    return () => {
      panel.remove()
      debugPanelRef.current = null
    }
  }, [debugEnabled])

  useEffect(() => {
    if (!registerTapHandler) {
      return
    }

    const raycaster = new Raycaster()
    const pointerNdc = new Vector2()

    const handleTap = (
      clientX: number,
      clientY: number,
    ) => {
      const runtime = runtimeRef.current

      if (
        !runtime ||
        pausedRef.current ||
        runtime.registry.size === 0
      ) {
        return
      }

      const rect = gl.domElement.getBoundingClientRect()
      pointerNdc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointerNdc, camera)

      const meshes: InstancedMesh[] = []

      for (const handle of runtime.registry.values()) {
        if (handle.mesh.count > 0) {
          meshes.push(handle.mesh)
        }
      }

      const [hit] = raycaster.intersectObjects(
        meshes,
        false,
      )

      if (!hit || hit.instanceId === undefined) {
        return
      }

      for (const [
        pageId,
        handle,
      ] of runtime.registry) {
        if (handle.mesh !== hit.object) {
          continue
        }

        const slotHit = handle.layout[hit.instanceId]
        const state = entryStoreRef.current.get(pageId)
        const record =
          slotHit && state
            ? state.manifest.letters[
                slotHit.letterIndex
              ]
            : undefined

        if (record) {
          onLetterSelectedRef.current?.(record)
        }

        return
      }
    }

    registerTapHandler(handleTap)

    return () => {
      registerTapHandler(null)
    }
  }, [registerTapHandler, gl, camera])

  useFrame((_, delta) => {
    const runtime = runtimeRef.current

    if (!runtime) {
      return
    }

    const scheduler = runtime.scheduler
    const speedFactor =
      (pausedRef.current
        ? 0
        : prefersReducedMotion
          ? fanLetterConfig.reducedMotion.speedFactor
          : 1) * debugSpeedFactor

    runtime.orbitTime += delta * speedFactor

    const dirty = scheduler.tick(performance.now())
    reconcileActivePages(runtime)

    const hasFades = scheduler.hasActiveFades()

    if (!dirty && !hasFades && speedFactor === 0) {
      return
    }

    const rollFactor = prefersReducedMotion
      ? fanLetterConfig.reducedMotion.rollFactor
      : 1

    for (const [
      pageId,
      handle,
    ] of runtime.registry) {
      if (dirty) {
        refreshHandle(runtime, pageId, handle)
      }

      writeBatchMatrices(
        runtime,
        handle,
        camera,
        rollFactor,
        hasFades,
      )
    }

    if (
      debugPanelRef.current &&
      performance.now() - debugLastUpdateRef.current > 500
    ) {
      debugLastUpdateRef.current = performance.now()

      let instances = 0
      for (const handle of runtime.registry.values()) {
        instances += handle.layout.length
      }

      debugPanelRef.current.textContent =
        `pages ${runtime.registry.size}` +
        ` · instances ${instances}` +
        ` · draw calls ${gl.info.render.calls}` +
        ` · textures ${gl.info.memory.textures}` +
        ` · resident ${runtime.cache.residentCount}`
    }
  })

  if (activePages.length === 0 || !geometry) {
    return null
  }

  return (
    <group>
      {activePages.map((page) => (
        <FanLetterAtlasBatch
          key={page.pageId}
          pageId={page.pageId}
          manifest={page.manifest}
          texture={page.texture}
          geometry={geometry}
          registerMesh={registerMesh}
        />
      ))}
    </group>
  )
}

function writeBatchMatrices(
  runtime: OrbitRuntime,
  handle: BatchHandle,
  camera: Camera,
  rollFactor: number,
  writeOpacity: boolean,
) {
  const { scheduler, slots, orbitTime } = runtime
  const { mesh, layout } = handle
  const opacityAttribute = handle.mesh.geometry.getAttribute(
    'aOpacity',
  ) as InstancedBufferAttribute

  for (let index = 0; index < layout.length; index++) {
    const entry = layout[index]
    const slot = slots[entry.slotIndex]
    const angle =
      slot.phase + orbitTime * slot.angularVelocity

    dummy.position.set(
      Math.cos(angle) * slot.radius,
      slot.height,
      Math.sin(angle) * slot.radius,
    )
    dummy.lookAt(camera.position)
    dummy.rotateZ(slot.roll * rollFactor)
    dummy.scale.set(
      slot.scale * handle.aspectRatios[index],
      slot.scale,
      1,
    )
    dummy.updateMatrix()

    mesh.setMatrixAt(index, dummy.matrix)

    if (writeOpacity) {
      opacityAttribute.setX(
        index,
        scheduler.getOpacity(entry.slotIndex),
      )
    }
  }

  mesh.count = layout.length
  mesh.instanceMatrix.needsUpdate = true

  if (writeOpacity) {
    opacityAttribute.needsUpdate = true
  }
}
