import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import {
  MeshBasicMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
  type InstancedMesh,
} from 'three'
import { ROOM } from '../roomConfig'
import {
  MARKER_LAYOUT,
  TRACKING_MARKER,
  type MarkerPlacement,
} from './layout'

function createMarkerGeometry() {
  const half = TRACKING_MARKER.size / 2
  const arm = TRACKING_MARKER.thickness / 2

  const shape = new Shape()
  shape.moveTo(-arm, -half)
  shape.lineTo(arm, -half)
  shape.lineTo(arm, -arm)
  shape.lineTo(half, -arm)
  shape.lineTo(half, arm)
  shape.lineTo(arm, arm)
  shape.lineTo(arm, half)
  shape.lineTo(-arm, half)
  shape.lineTo(-arm, arm)
  shape.lineTo(-half, arm)
  shape.lineTo(-half, -arm)
  shape.lineTo(-arm, -arm)
  shape.closePath()

  return new ShapeGeometry(shape)
}

const dummy = new Object3D()

function setInstanceTransform(
  mesh: InstancedMesh,
  placement: MarkerPlacement,
  index: number,
) {
  const inset = TRACKING_MARKER.wallInset

  switch (placement.wall) {
    case 'front':
      dummy.position.set(
        placement.u,
        placement.y,
        -ROOM.halfDepth + inset,
      )
      dummy.rotation.set(0, 0, 0)
      break

    case 'back':
      dummy.position.set(
        placement.u,
        placement.y,
        ROOM.halfDepth - inset,
      )
      dummy.rotation.set(0, Math.PI, 0)
      break

    case 'left':
      dummy.position.set(
        -ROOM.halfWidth + inset,
        placement.y,
        placement.u,
      )
      dummy.rotation.set(0, Math.PI / 2, 0)
      break

    case 'right':
      dummy.position.set(
        ROOM.halfWidth - inset,
        placement.y,
        placement.u,
      )
      dummy.rotation.set(0, -Math.PI / 2, 0)
      break
  }

  dummy.updateMatrix()
  mesh.setMatrixAt(index, dummy.matrix)
}

/**
 * All room tracking markers as a single static instanced batch: one
 * geometry, one unlit material, one draw call. Transforms are written
 * once from MARKER_LAYOUT — no per-frame work, no state, no interaction
 * (the fan-letter tap raycaster only intersects registered letter meshes).
 */
export function TrackingMarkers() {
  const meshRef = useRef<InstancedMesh>(null)

  const geometry = useMemo(() => createMarkerGeometry(), [])
  const material = useMemo(
    () => new MeshBasicMaterial({ color: TRACKING_MARKER.color }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    MARKER_LAYOUT.forEach((placement, index) => {
      setInstanceTransform(mesh, placement, index)
    })

    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MARKER_LAYOUT.length]}
    />
  )
}
