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
  /**
   * 전화 `↑`(받기)와 `↓`(나중에 / 통화 종료). 전화가 있을 때만 넘긴다.
   *
   * 없으면 방향키에 손대지 않는다. 위아래는 일시정지·결과 화면의 버튼
   * 고르기에 쓰이므로 항상 가로채면 그쪽이 죽는다. GAME_SPEC 14.6.
   */
  onPhoneUp?: () => void
  onPhoneDown?: () => void
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
      const isPhoneUp = key === 'arrowup' || event.code === 'ArrowUp'
      const isPhoneDown = key === 'arrowdown' || event.code === 'ArrowDown'
      const dismissMemo = handlersRef.current.onDismissMemo
      const phoneUp = handlersRef.current.onPhoneUp
      const phoneDown = handlersRef.current.onPhoneDown

      // 전화가 먼저다. 벨이 울리는 동안 판정은 어차피 막혀 있다.
      if (isPhoneUp && phoneUp) {
        event.preventDefault()
        phoneUp()

        return
      }

      if (isPhoneDown && phoneDown) {
        event.preventDefault()
        phoneDown()

        return
      }

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
