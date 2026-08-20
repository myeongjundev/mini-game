import { useEffect, useRef } from 'react'

import { DIFFICULTY } from '../config'

/**
 * 한 프레임에 반영하는 시간의 상한. 탭이 멈췄다 돌아올 때 밀린 시간이
 * 한꺼번에 들어오는 것을 막는다. 검사에서 프레임을 직접 돌릴 때도 이
 * 값을 쓴다.
 */
export const MAX_FRAME_DELTA_MS = 100

export type UseGameLoopOptions = {
  isRunning: boolean
  currentAlertId: string | null
  /**
   * 메모가 떠 있는 동안 현재 경보의 제한 시간을 멈춘다.
   *
   * 경보 한 장의 수명은 `eventIntervalMs`, 즉 3초다. 메모를 읽고 닫는 데 그
   * 절반 이상이 들고 그동안 경보를 볼 수도 없으니, 멈추지 않으면 메모가 뜬
   * 경보는 실력과 무관하게 미판정이 된다. 30초 근무 시계는 계속 흐르므로
   * 메모를 오래 열어둘 이유는 없다.
   */
  isAlertClockFrozen?: boolean
  onTick: (deltaMs: number) => void
  onTimeout: () => void
}

export function useGameLoop({
  isRunning,
  currentAlertId,
  isAlertClockFrozen = false,
  onTick,
  onTimeout,
}: UseGameLoopOptions): void {
  const frameIdRef = useRef<number | null>(null)
  const previousTimeRef = useRef<number | null>(null)
  const alertElapsedRef = useRef(0)
  const currentAlertIdRef = useRef(currentAlertId)
  const isAlertClockFrozenRef = useRef(isAlertClockFrozen)
  const onTickRef = useRef(onTick)
  const onTimeoutRef = useRef(onTimeout)

  isAlertClockFrozenRef.current = isAlertClockFrozen

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

          if (currentAlertIdRef.current !== null && !isAlertClockFrozenRef.current) {
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
