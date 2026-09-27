import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraRig } from './input/CameraRig'
import { Room } from './scene/Room'
import { FanLetterOrbit } from './scene/fan-letters/FanLetterOrbit'
import { FanLetterViewer } from './scene/fan-letters/FanLetterViewer'
import { loadFanLetterIndex } from './scene/fan-letters/loader'
import type { FanLetterRecord } from './scene/fan-letters/types'
import './App.css'

type ExperienceMode = 'intro' | 'gyro' | 'drag'

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export default function App() {
  const [mode, setMode] = useState<ExperienceMode>('intro')
  const [recenterToken, setRecenterToken] = useState(0)
  const [selectedLetter, setSelectedLetter] =
    useState<FanLetterRecord | null>(null)

  const tapHandlerRef = useRef<((clientX: number, clientY: number) => void) | null>(null)

  const registerTapHandler = useCallback(
    (handler: ((clientX: number, clientY: number) => void) | null) => {
      tapHandlerRef.current = handler
    },
    [],
  )

  // Fetch the fan-letter index during the intro screen so the first atlas
  // pages are usually resident before the user enters the room.
  useEffect(() => {
    void loadFanLetterIndex()
  }, [])

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
  const viewerOpen = selectedLetter !== null

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

        <FanLetterOrbit
          paused={viewerOpen}
          onLetterSelected={setSelectedLetter}
          registerTapHandler={registerTapHandler}
        />

        <CameraRig
          gyroEnabled={mode === 'gyro'}
          recenterToken={recenterToken}
          paused={viewerOpen}
          onTap={(clientX, clientY) => {
            tapHandlerRef.current?.(clientX, clientY)
          }}
        />
      </Canvas>

      {!active && (
        <div className="enter-screen">
          <div className="enter-card">
            <p className="eyebrow">Moka Day · 2026</p>

            <h1>Unnamed Project</h1>

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
              ? 'Move your phone or drag to look around · tap a letter to read it'
              : 'Drag to look around · tap a letter to read it'}
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

      {selectedLetter && (
        <FanLetterViewer
          record={selectedLetter}
          onClose={() => setSelectedLetter(null)}
        />
      )}
    </main>
  )
}
