import { useEffect, useRef } from 'react'

export type KeyboardHandlers = {
  onAllow: () => void
  onBlock: () => void
  onPauseToggle: () => void
  /**
   * 메모 닫기. 메모가 떠 있을 때만 넘긴다.
   *
   * 없으면 SPACE에 손을 대지 않는다. 항상 가로채면 포커스된 버튼이 SPACE로
   * 눌리지 않는다. 일시정지 화면의 RESUME·RESTART가 실제로 그랬다.
   */
  onDismissMemo?: () => void
}

export function useKeyboard(
  enabled: boolean,
  handlers: KeyboardHandlers,
): void {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const key = event.key.toLowerCase()
      const isAllow = key === 'a' || key === 'arrowleft' || event.code === 'KeyA'
      const isBlock = key === 'd' || key === 'arrowright' || event.code === 'KeyD'
      const isPause = key === 'p' || key === 'escape' || event.code === 'KeyP'
      const isDismiss = key === ' ' || event.code === 'Space'
      const dismissMemo = handlersRef.current.onDismissMemo

      if (isDismiss) {
        // 메모가 없으면 기본 동작을 그대로 둔다. 버튼은 Enter와 SPACE
        // 둘 다에 반응해야 한다.
        if (!dismissMemo) {
          return
        }

        event.preventDefault()
        dismissMemo()

        return
      }

      if (isAllow) {
        event.preventDefault()
        handlersRef.current.onAllow()
      } else if (isBlock) {
        event.preventDefault()
        handlersRef.current.onBlock()
      } else if (isPause) {
        event.preventDefault()
        handlersRef.current.onPauseToggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled])
}
