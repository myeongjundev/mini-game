// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { PHONE } from './game/config'
import { ALERTS } from './game/data/alerts'
import { MAX_FRAME_DELTA_MS } from './game/hooks/useGameLoop'

/**
 * 상사의 전화가 실제로 걸려 오는지 끝에서 끝까지 본다. 규칙은 GAME_SPEC 14절.
 *
 * 리듀서 검사(`machine.test.ts`)는 함수를 직접 부르므로 배선을 못 본다.
 * 21초까지 판을 굴리려면 그동안 경보를 살아서 넘겨야 하므로, 카드 제목으로
 * 정답을 찾아 눌러 준다.
 */
/**
 * **이 파일의 검사는 전부 21초를 굴린다.** 한 걸음마다 App 전체를 다시
 * 그리므로 기본 제한 5초로는 느린 기계에서 넘어간다.
 *
 * 실제로 넘어갔다. 2026-08-20·21의 배포 두 번이 이 파일 때문에 실패했고,
 * 그래서 08-21의 전화 작업이 공개본에 올라간 적이 없다. CI 러너는 공유
 * 자원이라 로컬보다 느리고, 로컬에서도 다른 파일과 병렬로 돌 때 한 번
 * 넘어갔다.
 *
 * `App.memo-hang.test.tsx`의 30초 검사도 같은 이유로 15초를 따로 받는다.
 */
vi.setConfig({ testTimeout: 20_000 })

describe('상사의 전화 — 판을 굴려서', () => {
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

  const phoneEl = () => container.querySelector('.phone-overlay')
  const memoEl = () => container.querySelector('.memo-toast')
  const title = () => container.querySelector('.alert-card h2')?.textContent

  /** 떠 있는 경보의 정답을 눌러 준다. 21초까지 살아 있어야 전화를 볼 수 있다. */
  const clearAlert = () => {
    const current = ALERTS.find((alert) => alert.title === title())
    if (current) press(current.correctAction === 'ALLOW' ? 'a' : 'd')
  }

  /** 전화가 뜰 때까지 굴린다. 메모가 끼면 닫고, 경보는 맞혀서 넘긴다. */
  const runUntilPhone = () => {
    act(() => root.render(<App />))
    press('Enter')
    const start = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'START SHIFT',
    )
    act(() => start?.click())

    for (let step = 0; step < 400 && phoneEl() === null; step += 1) {
      frame(MAX_FRAME_DELTA_MS)
      if (memoEl()) press(' ')
      else clearAlert()
    }
  }

  it('21초를 넘기면 전화가 걸려 온다', () => {
    runUntilPhone()

    expect(phoneEl()).not.toBeNull()
    expect(container.textContent).toContain('관제 팀장')
  })

  it('벨이 울리는 동안에는 판정이 막힌다', () => {
    runUntilPhone()
    const before = title()

    clearAlert()

    expect(phoneEl()).not.toBeNull()
    expect(title()).toBe(before)
  })

  it('↑로 받으면 통화로 넘어가고 벨 시계가 멈춘다', () => {
    runUntilPhone()
    press('ArrowUp')

    expect(container.querySelector('.phone-overlay-connected')).not.toBeNull()

    // 벨 시간을 한참 넘겨도 받은 전화는 놓치지 않는다.
    const lives = container.querySelectorAll('.heart-full').length
    for (let step = 0; step < 20; step += 1) frame(MAX_FRAME_DELTA_MS)

    expect(container.querySelector('.phone-overlay-connected')).not.toBeNull()
    expect(container.querySelectorAll('.heart-full').length).toBe(lives)
  })

  it('↓로 내리면 팝업이 사라지고 그 경보를 판정할 수 있다', () => {
    runUntilPhone()
    const before = title()

    press('ArrowDown')

    expect(phoneEl()).toBeNull()
    expect(container.querySelector('.phone-deferred')).not.toBeNull()

    clearAlert()
    expect(title()).not.toBe(before)
  })

  /**
   * 일시정지 중에는 전화가 화면에 없다. 팝업이 PLAYING 안에서만 그려지기
   * 때문이다. 그런데 키 리스너는 PAUSED에서도 살아 있다(useKeyboard).
   *
   * 보이지 않는 전화를 받을 수 있으면 **일시정지가 이득이 된다.** 벨은 경과
   * 시간으로 재는데 일시정지 중에는 경과가 늘지 않으므로, 멈춰 세운 뒤
   * 느긋하게 받으면 라이프를 잃을 위험 없이 상사의 말을 읽는다. 14.5의
   * 공정성 규칙은 그 반대를 요구한다.
   */
  it('일시정지 중에는 전화를 받을 수 없다', () => {
    runUntilPhone()

    press('p')
    press('ArrowUp')
    press('p')

    expect(container.querySelector('.phone-overlay-connected')).toBeNull()
    expect(phoneEl()).not.toBeNull()
  })

  it('일시정지 중에는 전화를 내리지도 끊지도 못한다', () => {
    runUntilPhone()

    press('p')
    press('ArrowDown')
    press('p')

    expect(container.querySelector('.phone-deferred')).toBeNull()
    expect(phoneEl()).not.toBeNull()
  })

  it('벨을 놓치면 라이프가 준다', () => {
    runUntilPhone()
    const before = container.querySelectorAll('.heart-full').length

    press('ArrowDown')
    // 벨이 다 갈 때까지 둔다. 그동안 경보는 계속 처리한다.
    const steps = Math.ceil(PHONE.ringMs / MAX_FRAME_DELTA_MS) + 5
    for (let step = 0; step < steps; step += 1) {
      frame(MAX_FRAME_DELTA_MS)
      if (container.querySelector('.phone-deferred') === null) break
    }

    expect(container.querySelector('.phone-deferred')).toBeNull()
    expect(container.querySelectorAll('.heart-full').length).toBeLessThan(before)
  })
})
