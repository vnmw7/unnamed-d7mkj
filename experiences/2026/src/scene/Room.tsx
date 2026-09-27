export function Room() {
  return (
    <>
      <ambientLight intensity={1.3} />

      <pointLight
        position={[0, 4, 0]}
        intensity={35}
        distance={15}
        decay={2}
      />

      {/* Front */}
      <mesh position={[0, 2.5, -6]}>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        />
      </mesh>

      {/* Back */}
      <mesh
        position={[0, 2.5, 6]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        />
      </mesh>

      {/* Left */}
      <mesh
        position={[-6, 2.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.9}
        />
      </mesh>

      {/* Right */}
      <mesh
        position={[6, 2.5, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[12, 5]} />
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
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={1}
        />
      </mesh>

      {/* Ceiling */}
      <mesh
        position={[0, 5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={1}
        />
      </mesh>
    </>
  )
}
