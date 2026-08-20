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
export function arrowStep(key: string): -1 | 0 | 1 {
  if (key === 'ArrowDown' || key === 'ArrowRight') {
    return 1
  }

  if (key === 'ArrowUp' || key === 'ArrowLeft') {
    return -1
  }

  return 0
}

/**
 * 목록 안에서 한 자리 옮긴다. 양 끝은 이어져 있다.
 *
 * 모달도 같은 규칙으로 움직여야 해서 훅 밖으로 뺐다. 모달은 창 대신 자기
 * 안에서 키를 받으므로 훅을 그대로 쓸 수 없다.
 */
export function stepFocus(items: readonly HTMLElement[], step: -1 | 1): void {
  if (items.length === 0) {
    return
  }

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

export function useMenuKeys(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const step = arrowStep(event.key)

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
      stepFocus(items, step)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [containerRef, enabled])
}
