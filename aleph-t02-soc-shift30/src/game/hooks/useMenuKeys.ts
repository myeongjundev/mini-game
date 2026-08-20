import { useEffect, type RefObject } from 'react'

/**
 * 방향키로 버튼 사이를 옮겨 다닌다. 로비·일시정지·결과 화면이 함께 쓴다.
 *
 * Tab으로도 되지만 옛 콘솔 메뉴는 방향키로 고르는 것이 자연스럽고, 게임
 * 화면에서 판정에 쓰는 손 모양과도 이어진다.
 *
 * **근무 중(PLAYING)에는 켜면 안 된다.** 그때 좌우는 ALLOW·BLOCK 판정 키다.
 * 여는 쪽에서 `enabled`로 막는다.
 */
export function useMenuKeys(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const step =
        event.key === 'ArrowDown' || event.key === 'ArrowRight'
          ? 1
          : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
            ? -1
            : 0

      // 누르고 있을 때 반복 처리하지 않는다. 기존 입력 규칙과 같다.
      if (step === 0 || event.repeat) {
        return
      }

      const items = [
        ...(containerRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []),
      ].filter((item) => !item.disabled)

      if (items.length === 0) {
        return
      }

      event.preventDefault()

      const index = items.findIndex((item) => item === document.activeElement)
      // 포커스가 목록 밖에 있으면 방향에 맞는 끝에서 시작한다.
      const next =
        index === -1
          ? step === 1
            ? 0
            : items.length - 1
          : (index + step + items.length) % items.length

      items[next].focus()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, enabled])
}
