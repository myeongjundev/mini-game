import { useEffect, useRef } from 'react'

import { DIFFICULTY } from '../config'

const MAX_FRAME_DELTA_MS = 100

export type UseGameLoopOptions = {
  isRunning: boolean
  currentAlertId: string | null
  onTick: (deltaMs: number) => void
  onTimeout: () => void
}

export function useGameLoop({
  isRunning,
  currentAlertId,
  onTick,
  onTimeout,
}: UseGameLoopOptions): void {
  const frameIdRef = useRef<number | null>(null)
  const previousTimeRef = useRef<number | null>(null)
  const alertElapsedRef = useRef(0)
  const currentAlertIdRef = useRef(currentAlertId)
  const onTickRef = useRef(onTick)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    currentAlertIdRef.current = currentAlertId
    alertElapsedRef.current = 0
  }, [currentAlertId])

  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!isRunning) {
      previousTimeRef.current = null
      return
    }

    const frame = () => {
      const now = performance.now()
      const previousTime = previousTimeRef.current
      previousTimeRef.current = now

      if (previousTime !== null) {
        const deltaMs = Math.min(
          Math.max(0, now - previousTime),
          MAX_FRAME_DELTA_MS,
        )

        if (deltaMs > 0) {
          onTickRef.current(deltaMs)

          if (currentAlertIdRef.current !== null) {
            alertElapsedRef.current += deltaMs

            if (alertElapsedRef.current >= DIFFICULTY.eventIntervalMs) {
              alertElapsedRef.current = 0
              onTimeoutRef.current()
            }
          }
        }
      }

      frameIdRef.current = requestAnimationFrame(frame)
    }

    frameIdRef.current = requestAnimationFrame(frame)

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current)
        frameIdRef.current = null
      }
      previousTimeRef.current = null
    }
  }, [isRunning])
}
