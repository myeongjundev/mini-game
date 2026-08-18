import { useEffect } from 'react'

export function useVisibilityPause(
  isPlaying: boolean,
  onPause: () => void,
): void {
  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onPause()
      }
    }
    const handleBlur = () => {
      onPause()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [isPlaying, onPause])
}
