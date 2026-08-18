import { useEffect } from 'react'

export type KeyboardHandlers = {
  onAllow: () => void
  onBlock: () => void
  onPauseToggle: () => void
}

export function useKeyboard(
  enabled: boolean,
  { onAllow, onBlock, onPauseToggle }: KeyboardHandlers,
): void {
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

      if (isAllow) {
        event.preventDefault()
        onAllow()
      } else if (isBlock) {
        event.preventDefault()
        onBlock()
      } else if (isPause) {
        event.preventDefault()
        onPauseToggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onAllow, onBlock, onPauseToggle])
}
