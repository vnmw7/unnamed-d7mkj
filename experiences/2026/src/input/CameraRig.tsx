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
  paused?: boolean
  onTap?: (clientX: number, clientY: number) => void
}

const screenAxis = new Vector3(0, 0, 1)

const forwardVector = new Vector3()

const tapMaxMovementPx = 6

// Below this horizontal forward length the heading is unreliable
// (phone pointing near straight up/down), so yaw stops updating.
const minYawHorizontal = 0.08

const pitchLimit = Math.PI / 2 - 0.08

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
  paused,
  onTap,
}: CameraRigProps) {
  const { camera, gl } = useThree()

  const pausedRef = useRef(paused ?? false)
  const onTapRef = useRef(onTap)

  useEffect(() => {
    pausedRef.current = paused ?? false
  }, [paused])

  useEffect(() => {
    onTapRef.current = onTap
  }, [onTap])

  const latestSensor = useRef(new Quaternion())

  // Yaw is tracked as an unwrapped accumulated heading so repeated
  // full revolutions stay continuous across the 0°/360° boundary.
  // yawBaseline marks which accumulated heading currently faces the
  // front of the room; pitch has deliberately no baseline, so the
  // camera keeps the phone's real up/down angle (including the angle
  // it was held at when the gyro started).
  const yawBaseline = useRef<number | null>(null)
  const previousRawYaw = useRef<number | null>(null)
  const accumulatedYaw = useRef(0)

  const sensorPitch = useRef(0)

  const targetEuler = useRef(new Euler(0, 0, 0, 'YXZ'))
  const targetQuaternion = useRef(new Quaternion())

  const touchYaw = useRef(0)
  const touchPitch = useRef(0)

  const dragging = useRef(false)
  const pointerId = useRef<number | null>(null)

  const previousPointer = useRef({
    x: 0,
    y: 0,
  })

  const tapStart = useRef({
    x: 0,
    y: 0,
    valid: false,
  })

  const sensorReady = useRef(false)

  useEffect(() => {
    if (!gyroEnabled) {
      yawBaseline.current = null
      previousRawYaw.current = null
      accumulatedYaw.current = 0
      sensorPitch.current = 0
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

      forwardVector
        .set(0, 0, -1)
        .applyQuaternion(latestSensor.current)

      const horizontal = Math.hypot(
        forwardVector.x,
        forwardVector.z,
      )

      sensorPitch.current = Math.atan2(
        forwardVector.y,
        horizontal,
      )

      if (horizontal > minYawHorizontal) {
        const rawYaw = Math.atan2(
          -forwardVector.x,
          -forwardVector.z,
        )

        if (previousRawYaw.current === null) {
          previousRawYaw.current = rawYaw
        } else {
          const rawDelta =
            rawYaw - previousRawYaw.current

          accumulatedYaw.current += Math.atan2(
            Math.sin(rawDelta),
            Math.cos(rawDelta),
          )

          previousRawYaw.current = rawYaw
        }

        if (yawBaseline.current === null) {
          yawBaseline.current =
            accumulatedYaw.current
        }
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

      tapStart.current = {
        x: event.clientX,
        y: event.clientY,
        valid: true,
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

      touchYaw.current += dx * 0.003

      touchPitch.current = MathUtils.clamp(
        touchPitch.current + dy * 0.003,
        -Math.PI / 2 + 0.08,
        Math.PI / 2 - 0.08,
      )
    }

    const finishPointer = (
      event: PointerEvent,
      cancelled: boolean,
    ) => {
      if (event.pointerId !== pointerId.current) {
        return
      }

      dragging.current = false
      pointerId.current = null

      if (
        !cancelled &&
        tapStart.current.valid &&
        !pausedRef.current &&
        onTapRef.current
      ) {
        const movedX =
          event.clientX - tapStart.current.x

        const movedY =
          event.clientY - tapStart.current.y

        if (
          Math.hypot(movedX, movedY) <=
          tapMaxMovementPx
        ) {
          onTapRef.current(event.clientX, event.clientY)
        }
      }

      tapStart.current.valid = false

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

    const finishListenerUp = (event: PointerEvent) =>
      finishPointer(event, false)

    const finishListenerCancel = (event: PointerEvent) =>
      finishPointer(event, true)

    element.addEventListener(
      'pointerup',
      finishListenerUp,
    )

    element.addEventListener(
      'pointercancel',
      finishListenerCancel,
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
        finishListenerUp,
      )

      element.removeEventListener(
        'pointercancel',
        finishListenerCancel,
      )
    }
  }, [gl])

  useFrame((_, delta) => {
    if (pausedRef.current) {
      return
    }

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
        .copy(inverseBaseline.current)
        .multiply(latestSensor.current)

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
