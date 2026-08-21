// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

/**
 * 판이 멈춘 화면(일시정지·결과)에서의 방향키 이동.
 *
 * 근무 중에는 켜지면 안 된다. 그때 좌우는 ALLOW·BLOCK 판정 키다.
 * 규칙은 `game/hooks/useMenuKeys.ts`에 있다.
 */
describe('멈춘 화면의 방향키 이동', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const frames: FrameRequestCallback[] = []
  let now = 0

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    localStorage.clear()
    now = 0
    frames.length = 0
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(performance, 'now').mockImplementation(() => now)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const press = (key: string) =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }))
    })

  const label = () => document.activeElement?.textContent?.trim()

  const startShift = () => {
    act(() => root.render(<App />))
    press('Enter')
    const start = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'START SHIFT',
    )
    act(() => start?.click())
  }

  it('일시정지 화면에서 방향키로 버튼을 고른다', () => {
    startShift()
    press('p')

    // 들어오면 첫 버튼이 잡혀 있어야 방향키에 시작점이 생긴다.
    expect(label()).toBe('RESUME')

    press('ArrowDown')
    expect(label()).toBe('RESTART')

    press('ArrowUp')
    expect(label()).toBe('RESUME')

    // 양 끝에서 이어진다.
    press('ArrowUp')
    expect(label()).not.toBe('RESUME')
  })

  it('근무 중에는 방향키가 버튼을 옮기지 않는다', () => {
    startShift()

    const before = document.activeElement
    press('ArrowDown')

    // 근무 중 좌우아래는 판정 키의 자리다. 포커스를 건드리면 안 된다.
    expect(document.activeElement).toBe(before)
  })

  it('결과 화면에서도 방향키로 버튼을 고른다', () => {
    startShift()
    // 아무것도 누르지 않으면 라이프가 떨어져 결과 화면이 뜬다.
    act(() => frames[frames.length - 1]?.(now))
    for (let step = 0; step < 400; step += 1) {
      now += 100
      act(() => frames[frames.length - 1]?.(now))
      if (container.querySelector('.result-screen')) break
    }

    expect(container.querySelector('.result-screen')).not.toBeNull()
    // 재도전이 기본 버튼이다. 한 판이 30초라 다시 하는 쪽이 더 잦다.
    expect(label()).toBe('RETRY SHIFT')

    press('ArrowDown')
    expect(label()).not.toBe('RETRY SHIFT')
  })
})
