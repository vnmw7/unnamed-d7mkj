export function Room() {
  return (
    <>
      <ambientLight intensity={1.3} />

      <pointLight
        position={[0, 2.4, 0]}
        intensity={35}
        distance={10}
        decay={2}
      />

      {/* Front */}
      <mesh position={[0, 1.5, -4]}>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial
          color="#e7c6d8"
          roughness={0.9}
        />
      </mesh>

      {/* Back */}
      <mesh
        position={[0, 1.5, 4]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial
          color="#cfe4dc"
          roughness={0.9}
        />
      </mesh>

      {/* Left */}
      <mesh
        position={[-4, 1.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial
          color="#d8cfeb"
          roughness={0.9}
        />
      </mesh>

      {/* Right */}
      <mesh
        position={[4, 1.5, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial
          color="#ead2bd"
          roughness={0.9}
        />
      </mesh>

      {/* Floor */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial
          color="#d9cbbd"
          roughness={1}
        />
      </mesh>

      {/* Ceiling */}
      <mesh
        position={[0, 3, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial
          color="#f4edf1"
          roughness={1}
        />
      </mesh>

      {/* Temporary objects so depth is immediately obvious. */}
      <mesh position={[0, 0.5, -2.4]}>
        <boxGeometry args={[1.2, 1, 0.55]} />
        <meshStandardMaterial
          color="#bd7896"
          roughness={0.7}
        />
      </mesh>

      <mesh position={[-2.2, 0.35, -1.5]}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial
          color="#8575a7"
          roughness={0.7}
        />
      </mesh>

      <mesh position={[2.1, 0.25, 1.7]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color="#ab8063"
          roughness={0.7}
        />
      </mesh>
    </>
  )
}
