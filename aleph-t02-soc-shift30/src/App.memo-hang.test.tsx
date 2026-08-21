// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { DIFFICULTY } from './game/config'
import { MAX_FRAME_DELTA_MS } from './game/hooks/useGameLoop'

/**
 * 메모가 떠 있는 동안 들어온 판정 입력.
 *
 * 리듀서는 메모 중 판정을 거부한다(GAME_SPEC 13절). 화면이 그 입력을
 * 처리된 것으로 기록하면 경보가 판정도 만료도 되지 않고 남는다. 다음
 * 경보도 오지 않고 근무 시계만 흘러 판이 그 자리에서 멈춘다.
 *
 * 버튼은 메모 중 비활성이라 마우스로는 이 경로에 닿지 않는다. 키보드만
 * 뚫는다. 그래서 검사도 키로 한다.
 */
describe('메모 중 판정 입력', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let now = 0
  const frames: FrameRequestCallback[] = []

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

/**
   * rAF가 없는 환경이라 프레임을 직접 돌린다.
   *
   * 한 걸음을 루프의 상한과 같게 잡는다. 이보다 잘게 돌려도 루프가 보는
   * 값은 달라지지 않는데 act() 렌더만 배로 늘어난다. 50ms로 돌던 때
   * 30초짜리 검사가 600번을 돌아 5.8초가 걸렸고 기본 제한 5초를 넘겼다.
   */
  const advance = (totalMs: number) => {
    let left = totalMs

    while (left > 0) {
      const delta = Math.min(MAX_FRAME_DELTA_MS, left)
      now += delta
      left -= delta
      const frame = frames[frames.length - 1]
      act(() => frame?.(now))
    }
  }

  const press = (key: string) => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }))
    })
  }

  const alertTitle = () =>
    container.querySelector('.alert-card h2')?.textContent ?? null

  const startShiftAndWaitForMemo = () => {
    act(() => root.render(<App />))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })
    const start = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'START SHIFT',
    )
    expect(start).toBeDefined()
    act(() => start?.click())
    advance(50)

    let guard = 0
    while (container.querySelector('.memo-toast') === null && guard < 400) {
      advance(50)
      guard += 1
    }

    expect(container.querySelector('.memo-toast')).not.toBeNull()
    expect(alertTitle()).not.toBeNull()
  }

  it('메모 중 누른 키는 그 경보를 그대로 둔다', () => {
    startShiftAndWaitForMemo()
    const title = alertTitle()

    press('a')

    expect(container.querySelector('.memo-toast')).not.toBeNull()
    expect(alertTitle()).toBe(title)
  })

  /**
   * 일시정지 중에는 메모도 화면에 없다. 그런데 SPACE 리스너는 살아 있다.
   *
   * 보이지 않는 메모를 닫을 수 있으면 **일시정지가 이득이 된다.** 근무
   * 시계는 메모를 읽는 동안에도 흐르지만 일시정지에서는 멈추므로, 멈춰
   * 세운 뒤 닫으면 읽는 값을 30초에서 내지 않는다.
   */
  it('일시정지 중에는 메모를 닫을 수 없다', () => {
    startShiftAndWaitForMemo()

    press('p')
    press(' ')
    press('p')

    expect(container.querySelector('.memo-toast')).not.toBeNull()
  })

  it('메모 중 키를 눌러도 닫은 뒤의 판정은 받아들여진다', () => {
    startShiftAndWaitForMemo()
    const title = alertTitle()

    press('a')
    press(' ')
    expect(container.querySelector('.memo-toast')).toBeNull()

    press('a')

    expect(alertTitle()).not.toBe(title)
  })

  it('메모 중 키를 눌러도 그 경보는 제한 시간에 만료된다', () => {
    startShiftAndWaitForMemo()
    const title = alertTitle()

    press('a')
    press(' ')
    // 상수에서 파생시킨다. 난이도 실험으로 값이 바뀌어도 검사가 썩지 않는다.
    advance(DIFFICULTY.eventIntervalMs + 500)

    expect(alertTitle()).not.toBe(title)
  })

  // 30초를 전부 돌리는 유일한 검사다. 느린 기계에서도 넘어가지 않게
  // 제한을 따로 준다.
  it('메모 중 키를 누른 경보도 판정 기록에 남는다', () => {
    startShiftAndWaitForMemo()
    const title = alertTitle()

    press('a')
    press(' ')
    advance(30_000)

    // 근무 시계는 어차피 30초에 끝나므로 결과 화면이 떴는지만 봐서는
    // 멈춤을 못 잡는다. 멈춘 경보는 판정도 만료도 되지 않아 기록에
    // 아예 오르지 않는다. 그것을 본다.
    expect(container.querySelector('.result-screen')).not.toBeNull()
    const logged = [...container.querySelectorAll('.shift-log-title')].map(
      (entry) => entry.textContent,
    )
    expect(logged).toContain(title)
  }, 15_000)
})
