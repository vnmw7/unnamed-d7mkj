import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import { CameraRig } from './input/CameraRig'
import { Room } from './scene/Room'
import './App.css'

type ExperienceMode = 'intro' | 'gyro' | 'drag'

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export default function App() {
  const [mode, setMode] = useState<ExperienceMode>('intro')
  const [recenterToken, setRecenterToken] = useState(0)

  async function enterRoom() {
    if (!('DeviceOrientationEvent' in window)) {
      setMode('drag')
      return
    }

    const OrientationEvent =
      DeviceOrientationEvent as OrientationEventConstructor

    try {
      if (typeof OrientationEvent.requestPermission === 'function') {
        const permission = await OrientationEvent.requestPermission()

        setMode(permission === 'granted' ? 'gyro' : 'drag')
        return
      }

      setMode('gyro')
    } catch {
      setMode('drag')
    }
  }

  const active = mode !== 'intro'

  return (
    <main className="experience">
      <Canvas
        dpr={[1, 1.5]}
        camera={{
          position: [0, 1.6, 0],
          fov: 70,
          near: 0.05,
          far: 30,
        }}
      >
        <color attach="background" args={['#efe6f0']} />

        <Room />

        <CameraRig
          gyroEnabled={mode === 'gyro'}
          recenterToken={recenterToken}
        />
      </Canvas>

      {!active && (
        <div className="enter-screen">
          <div className="enter-card">
            <p className="eyebrow">Moka Day · 2026</p>

            <h1>Moka's Room</h1>

            <p>
              Move your phone around to explore the room in 360°.
              You can also drag the screen.
            </p>

            <button type="button" onClick={enterRoom}>
              Enter room
            </button>
          </div>
        </div>
      )}

      {active && (
        <>
          <div className="experience-hint">
            {mode === 'gyro'
              ? 'Move your phone or drag to look around'
              : 'Drag to look around'}
          </div>

          <button
            type="button"
            className="recenter"
            onClick={() => setRecenterToken((value) => value + 1)}
          >
            Recenter
          </button>
        </>
      )}
    </main>
  )
}
