import { useEffect, useRef } from 'react'

export type KeyboardHandlers = {
  onAllow: () => void
  onBlock: () => void
  onPauseToggle: () => void
  /** 메모 닫기. 없으면 SPACE는 아무 일도 하지 않는다. */
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

      if (isDismiss) {
        event.preventDefault()
        handlersRef.current.onDismissMemo?.()

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
