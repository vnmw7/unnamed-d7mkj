import { useEffect, useMemo, useRef } from 'react'
import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Sphere,
  Vector3,
  type InstancedMesh,
  type PlaneGeometry,
  type Texture,
} from 'three'
import { createCardMaterial } from './cardShader'
import type { FanLetterPageManifest } from './types'

interface FanLetterAtlasBatchProps {
  pageId: string
  manifest: FanLetterPageManifest
  texture: Texture
  geometry: PlaneGeometry
  registerMesh: (
    pageId: string,
    mesh: InstancedMesh | null,
  ) => void
}

/**
 * One instanced draw batch per atlas page: a single plane geometry, a
 * single atlas material, N instances. Per-letter placement and opacity are
 * written by the orbit's central useFrame; the batch only owns GPU
 * resources and registers itself with the orbit.
 */
export function FanLetterAtlasBatch({
  pageId,
  manifest,
  texture,
  geometry,
  registerMesh,
}: FanLetterAtlasBatchProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const material = useMemo(
    () => createCardMaterial(texture),
    [texture],
  )
  const count = manifest.letters.length

  useEffect(() => {
    const mesh = meshRef.current

    if (!mesh) {
      return
    }

    mesh.instanceMatrix.setUsage(DynamicDrawUsage)

    const uvRects = new Float32Array(count * 4)
    manifest.letters.forEach((letter, index) => {
      uvRects.set(letter.uv, index * 4)
    })

    mesh.geometry.setAttribute(
      'aUvRect',
      new InstancedBufferAttribute(uvRects, 4),
    )
    mesh.geometry.setAttribute(
      'aOpacity',
      new InstancedBufferAttribute(
        new Float32Array(count),
        1,
      ),
    )

    mesh.boundingSphere = new Sphere(new Vector3(), 100)

    registerMesh(pageId, mesh)

    return () => {
      registerMesh(pageId, null)
    }
  }, [pageId, manifest, registerMesh, count])

  useEffect(
    () => () => {
      material.dispose()
    },
    [material],
  )

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
    />
  )
}
