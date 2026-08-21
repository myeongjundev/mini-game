// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { ALERTS } from './game/data/alerts'
import { MAX_FRAME_DELTA_MS } from './game/hooks/useGameLoop'

/**
 * 라이프를 잃었을 때의 화면 표시.
 *
 * 흔들림을 `data-feedback`에 걸면 **같은 종류로 연달아 틀렸을 때 두 번째가
 * 흔들리지 않는다.** 속성 값이 그대로여서 CSS 애니메이션이 다시 시작되지
 * 않기 때문이다. 눈으로는 "가끔 안 흔들리는 것 같다"로만 보여서 잡기 어렵다.
 * 그래서 홀짝이 실제로 뒤집히는지를 검사로 고정한다.
 */
describe('라이프를 잃으면', () => {
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

  const press = (key: string) => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key }))
    })
  }

  const frame = (deltaMs: number) => {
    now += deltaMs
    const callback = frames[frames.length - 1]
    act(() => callback?.(now))
  }

  const shell = () => container.querySelector('.app-shell')
  const damage = () => shell()?.getAttribute('data-damage') ?? null
  const title = () => container.querySelector('.alert-card h2')?.textContent
  const hearts = () => container.querySelectorAll('.heart-full').length

  const start = () => {
    act(() => root.render(<App />))
    press('Enter')
    const button = [...container.querySelectorAll('button')].find(
      (item) => item.textContent === 'START SHIFT',
    )
    act(() => button?.click())
    frame(MAX_FRAME_DELTA_MS)
  }

  /** 떠 있는 경보의 **오답**을 눌러 라이프를 하나 깎는다. */
  const answerWrong = () => {
    const current = ALERTS.find((alert) => alert.title === title())
    if (current) press(current.correctAction === 'ALLOW' ? 'd' : 'a')
    frame(MAX_FRAME_DELTA_MS)
  }

  it('판을 시작한 직후에는 표시가 없다', () => {
    start()

    expect(damage()).toBeNull()
    expect(hearts()).toBe(3)
  })

  it('연달아 틀려도 매번 다시 흔들린다', () => {
    start()

    answerWrong()
    const first = damage()
    expect(first).not.toBeNull()
    expect(hearts()).toBe(2)

    answerWrong()
    const second = damage()
    expect(hearts()).toBe(1)

    // 값이 뒤집혀야 선택자가 바뀌고 애니메이션이 다시 시작된다.
    expect(second).not.toBe(first)

    answerWrong()

    expect(damage()).toBe(first)
    expect(hearts()).toBe(0)
  })

  it('마지막 하나가 남으면 하트 줄이 경고 상태가 된다', () => {
    start()

    answerWrong()
    expect(container.querySelector('.heart-row-critical')).toBeNull()

    answerWrong()
    expect(container.querySelector('.heart-row-critical')).not.toBeNull()
  })

  it('방금 꺼진 하트에 표시가 붙는다', () => {
    start()
    answerWrong()

    const marked = container.querySelectorAll('.heart-just-lost')

    expect(marked).toHaveLength(1)
    expect(marked[0].classList.contains('heart-empty')).toBe(true)
  })
})
