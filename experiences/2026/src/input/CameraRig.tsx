import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import {
  Euler,
  MathUtils,
  Quaternion,
  Vector3,
} from 'three'

interface CameraRigProps {
  gyroEnabled: boolean
  recenterToken: number
}

const screenAxis = new Vector3(0, 0, 1)

const deviceToCamera = new Quaternion(
  -Math.sqrt(0.5),
  0,
  0,
  Math.sqrt(0.5),
)

const orientationEuler = new Euler()
const screenQuaternion = new Quaternion()

function getScreenAngle() {
  const legacyWindow = window as Window & {
    orientation?: number
  }

  return MathUtils.degToRad(
    screen.orientation?.angle ??
      legacyWindow.orientation ??
      0,
  )
}

function getDeviceQuaternion(
  event: DeviceOrientationEvent,
  target: Quaternion,
) {
  const alpha = MathUtils.degToRad(event.alpha ?? 0)
  const beta = MathUtils.degToRad(event.beta ?? 0)
  const gamma = MathUtils.degToRad(event.gamma ?? 0)

  orientationEuler.set(
    beta,
    alpha,
    -gamma,
    'YXZ',
  )

  target.setFromEuler(orientationEuler)

  // Convert the phone coordinate system to Three.js's camera system.
  target.multiply(deviceToCamera)

  // Compensate for portrait / landscape screen rotation.
  screenQuaternion.setFromAxisAngle(
    screenAxis,
    -getScreenAngle(),
  )

  target.multiply(screenQuaternion)

  return target
}

export function CameraRig({
  gyroEnabled,
  recenterToken,
}: CameraRigProps) {
  const { camera, gl } = useThree()

  const latestSensor = useRef(new Quaternion())
  const baseline = useRef<Quaternion | null>(null)

  const relativeSensor = useRef(new Quaternion())
  const inverseBaseline = useRef(new Quaternion())

  const touchQuaternion = useRef(new Quaternion())
  const targetQuaternion = useRef(new Quaternion())

  const touchEuler = useRef(new Euler(0, 0, 0, 'YXZ'))
  const touchYaw = useRef(0)
  const touchPitch = useRef(0)

  const dragging = useRef(false)
  const pointerId = useRef<number | null>(null)

  const previousPointer = useRef({
    x: 0,
    y: 0,
  })

  const sensorReady = useRef(false)

  useEffect(() => {
    if (!gyroEnabled) {
      baseline.current = null
      sensorReady.current = false
      return
    }

    const onOrientation = (
      event: DeviceOrientationEvent,
    ) => {
      if (
        event.alpha === null ||
        event.beta === null ||
        event.gamma === null
      ) {
        return
      }

      getDeviceQuaternion(
        event,
        latestSensor.current,
      )

      if (!baseline.current) {
        baseline.current =
          latestSensor.current.clone()
      }

      sensorReady.current = true
    }

    window.addEventListener(
      'deviceorientation',
      onOrientation,
      true,
    )

    return () => {
      window.removeEventListener(
        'deviceorientation',
        onOrientation,
        true,
      )
    }
  }, [gyroEnabled])

  useEffect(() => {
    touchYaw.current = 0
    touchPitch.current = 0

    if (sensorReady.current) {
      baseline.current =
        latestSensor.current.clone()
    }
  }, [recenterToken])

  useEffect(() => {
    const element = gl.domElement

    const onPointerDown = (
      event: PointerEvent,
    ) => {
      dragging.current = true
      pointerId.current = event.pointerId

      previousPointer.current = {
        x: event.clientX,
        y: event.clientY,
      }

      element.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (
      event: PointerEvent,
    ) => {
      if (
        !dragging.current ||
        event.pointerId !== pointerId.current
      ) {
        return
      }

      const dx =
        event.clientX - previousPointer.current.x

      const dy =
        event.clientY - previousPointer.current.y

      previousPointer.current = {
        x: event.clientX,
        y: event.clientY,
      }

      touchYaw.current -= dx * 0.003

      touchPitch.current = MathUtils.clamp(
        touchPitch.current - dy * 0.003,
        -Math.PI / 2 + 0.08,
        Math.PI / 2 - 0.08,
      )
    }

    const finishPointer = (
      event: PointerEvent,
    ) => {
      if (event.pointerId !== pointerId.current) {
        return
      }

      dragging.current = false
      pointerId.current = null

      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(
          event.pointerId,
        )
      }
    }

    element.addEventListener(
      'pointerdown',
      onPointerDown,
    )

    element.addEventListener(
      'pointermove',
      onPointerMove,
    )

    element.addEventListener(
      'pointerup',
      finishPointer,
    )

    element.addEventListener(
      'pointercancel',
      finishPointer,
    )

    return () => {
      element.removeEventListener(
        'pointerdown',
        onPointerDown,
      )

      element.removeEventListener(
        'pointermove',
        onPointerMove,
      )

      element.removeEventListener(
        'pointerup',
        finishPointer,
      )

      element.removeEventListener(
        'pointercancel',
        finishPointer,
      )
    }
  }, [gl])

  useFrame((_, delta) => {
    touchEuler.current.set(
      touchPitch.current,
      touchYaw.current,
      0,
      'YXZ',
    )

    touchQuaternion.current.setFromEuler(
      touchEuler.current,
    )

    if (
      gyroEnabled &&
      sensorReady.current &&
      baseline.current
    ) {
      inverseBaseline.current
        .copy(baseline.current)
        .invert()

      relativeSensor.current
        .copy(latestSensor.current)
        .multiply(inverseBaseline.current)

      targetQuaternion.current
        .copy(touchQuaternion.current)
        .multiply(relativeSensor.current)
    } else {
      targetQuaternion.current.copy(
        touchQuaternion.current,
      )
    }

    // Frame-rate independent smoothing.
    const smoothing =
      1 - Math.exp(-12 * delta)

    camera.quaternion.slerp(
      targetQuaternion.current,
      smoothing,
    )

    camera.position.set(0, 1.6, 0)
  })

  return null
}
