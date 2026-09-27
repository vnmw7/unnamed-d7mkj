import { ROOM } from './roomConfig'
import { TrackingMarkers } from './tracking-markers/TrackingMarkers'

export function Room() {
  return (
    <>
      <ambientLight intensity={4} />

      <pointLight
        position={[0, 4, 0]}
        intensity={80}
        distance={15}
        decay={2}
      />

      {/* Front */}
      <mesh position={[0, ROOM.halfHeight, -ROOM.halfDepth]}>
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        />
      </mesh>

      {/* Back */}
      <mesh
        position={[0, ROOM.halfHeight, ROOM.halfDepth]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        />
      </mesh>

      {/* Left */}
      <mesh
        position={[-ROOM.halfWidth, ROOM.halfHeight, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        />
      </mesh>

      {/* Right */}
      <mesh
        position={[ROOM.halfWidth, ROOM.halfHeight, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        />
      </mesh>

      {/* Floor */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial
          color="#e9e9e9"
          roughness={1}
        />
      </mesh>

      {/* Ceiling */}
      <mesh
        position={[0, ROOM.height, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={1}
        />
      </mesh>

      <TrackingMarkers />
    </>
  )
}
