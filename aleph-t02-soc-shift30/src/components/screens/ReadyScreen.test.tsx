// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReadyScreen, { type ReadyScreenProps } from './ReadyScreen'

const handlers = {
  onIntroComplete: vi.fn(),
  onStart: vi.fn(),
  onToggleMute: vi.fn(),
  onSetVolume: vi.fn(),
  onToggleReduceMotion: vi.fn(),
}

describe('ReadyScreen intro and lobby', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const renderScreen = (props: Partial<ReadyScreenProps> = {}) => {
    act(() => root.render(
      <ReadyScreen bestScore={900} mute volume={1} reduceMotion={false} playIntro
        {...handlers} {...props} />,
    ))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    Object.values(handlers).forEach((handler) => handler.mockClear())
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.useRealTimers()
  })

  it('runs the complete intro sequence and enters the lobby once', () => {
    renderScreen()
    const scene = () => container.querySelector('.lobby-scene')
    const live = () => container.querySelector('.lobby-live-status')
    expect(scene()?.getAttribute('data-lobby-phase')).toBe('BOOT')
    // 라이브 리전은 첫 프레임부터 DOM에 있어야 이후 문구가 읽힌다.
    expect(live()?.getAttribute('aria-live')).toBe('polite')
    expect(live()?.textContent).toBe('시스템 부팅 중')

    act(() => vi.advanceTimersByTime(400))
    expect(scene()?.getAttribute('data-lobby-phase')).toBe('INITIALIZING')
    act(() => vi.advanceTimersByTime(1_300))
    expect(scene()?.getAttribute('data-lobby-phase')).toBe('TITLE')
    act(() => vi.advanceTimersByTime(850))
    expect(scene()?.getAttribute('data-lobby-phase')).toBe('READY')
    act(() => vi.advanceTimersByTime(550))

    expect(scene()?.getAttribute('data-lobby-phase')).toBe('LOBBY')
    expect(handlers.onIntroComplete).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('START SHIFT')
    expect(document.activeElement?.textContent).toBe('START SHIFT')
    // 같은 노드가 인트로 내내 유지되어야 스크린리더가 변화를 읽는다.
    expect(live()?.textContent).toBe('야간 근무 로비')
  })

  it('skips by keyboard and cleared timers cannot change the lobby later', () => {
    renderScreen()
    const event = new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true })
    act(() => window.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(true)
    expect(container.querySelector('.lobby-scene')?.getAttribute('data-lobby-phase')).toBe('LOBBY')
    expect(handlers.onIntroComplete).toHaveBeenCalledTimes(1)
    act(() => vi.runAllTimers())
    expect(handlers.onIntroComplete).toHaveBeenCalledTimes(1)
  })

  it('uses the short reduced-motion timing and keeps lobby controls functional', () => {
    renderScreen({ reduceMotion: true })
    for (const duration of [80, 200, 180, 120]) {
      act(() => vi.advanceTimersByTime(duration))
    }
    expect(container.textContent).toContain('START SHIFT')

    const howToPlay = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'HOW TO PLAY')
    act(() => howToPlay?.click())
    // 첫 쪽은 규칙과 조작키다. 조작을 모르는 사람이 제일 먼저 보는 곳이다.
    expect(container.textContent).toContain('가만히 있으면 집니다')
    expect(container.querySelector('.guide-controls')?.textContent).toContain('A / ←')
    expect(container.querySelector('.lobby-console')?.hasAttribute('aria-live')).toBe(false)
  })

  const openGuide = () => {
    renderScreen({ playIntro: false })
    const howToPlay = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'HOW TO PLAY')
    act(() => howToPlay?.click())
  }

  // 가이드는 로비 패널이 아니라 모달이 됐다. 쪽 넘김은 그림의 하단 버튼
  // 자리 둘을 쓴다. 규격은 prompts/04_LOBBY_MODAL_WINDOW_HANDOFF.md에 있다.
  const pager = (label: string) => [...container.querySelectorAll('.lobby-modal-command')]
    .find((button) => button.getAttribute('aria-label') === label) as HTMLButtonElement | undefined

  const guideHeading = () => container.querySelector('.lobby-guide-head h3')?.textContent

  it('pages through the guide and stops at both ends', () => {
    openGuide()
    const prev = () => pager('이전 쪽')
    const next = () => pager('다음 쪽')

    expect(prev()?.disabled).toBe(true)
    expect(guideHeading()).toBe('근무 요령')

    // 근무 3초부터 공지가 뜨므로 판단 교재보다 앞에 둔다.
    act(() => next()?.click())
    expect(guideHeading()).toBe('근무 중 공지')
    expect(container.querySelector('.guide-memo-body')?.textContent).toBeTruthy()
    expect(container.textContent).toContain('경보 제한시간도 함께 멈춥니다')

    // 전화도 근무 중에 끼어드는 것이라 판단 교재보다 앞이다. 라이프가
    // 걸려 있고 지시가 거짓일 수 있다는 것을 미리 알려야 한다.
    act(() => next()?.click())
    expect(guideHeading()).toBe('상사의 전화')
    expect(container.textContent).toContain('끝까지 안 받으면 라이프가 줄어듭니다')
    expect(container.textContent).toContain('지시가 언제나 옳지는 않습니다')

    // 통과와 차단을 쪽으로 나눠 각각 이유까지 보여준다.
    act(() => next()?.click())
    expect(guideHeading()).toBe('통과시키는 경보')
    expect(container.querySelectorAll('.ready-example')).toHaveLength(1)
    expect(container.querySelectorAll('.suspicious-marker')).toHaveLength(0)
    expect(container.querySelector('.ready-example-why')?.textContent).toBeTruthy()

    act(() => next()?.click())
    expect(guideHeading()).toBe('막는 경보')
    expect(container.querySelectorAll('.suspicious-marker')).toHaveLength(3)
    expect(container.querySelector('.ready-example-why')?.textContent).toBeTruthy()

    // 목적지 한 줄만 다른 두 경보. 표시 개수로 세면 안 된다는 것을 보여준다.
    act(() => next()?.click())
    expect(container.querySelectorAll('.guide-compare-row')).toHaveLength(2)
    expect(container.textContent).toContain('목적지 한 줄이 갈랐습니다')

    act(() => next()?.click())
    expect(container.textContent).toContain('표시 개수가 아니라')
    expect(container.textContent).toContain('FALSE POSITIVE')
    expect(container.textContent).toContain('MISSED THREAT')
    // 마지막 쪽에는 다음이 없다. 그 자리가 CLOSE로 바뀐다.
    expect(next()).toBeUndefined()
    expect(container.querySelectorAll('.lobby-modal-command')[1].textContent).toBe('CLOSE')

    act(() => prev()?.click())
    expect(guideHeading()).toBe('같아 보이지만 다른 것')
  })

  it('closes the guide back to the menu and refocuses the button that opened it', () => {
    openGuide()
    const close = container.querySelector<HTMLButtonElement>('.lobby-modal-close')

    act(() => close?.click())

    expect(container.querySelector('.lobby-modal')).toBeNull()
    expect(container.querySelector('.lobby-menu')).not.toBeNull()
    // 모달을 연 버튼으로 돌아온다. START SHIFT가 아니다.
    expect(document.activeElement?.textContent).toBe('HOW TO PLAY')
  })

  it('moves focus between lobby buttons with the arrow keys', () => {
    renderScreen({ playIntro: false })
    const arrow = (key: string) =>
      act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key })))

    // 로비에 들어오면 START SHIFT가 잡혀 있다.
    expect(document.activeElement?.textContent).toBe('START SHIFT')

    arrow('ArrowDown')
    expect(document.activeElement?.textContent).toBe('HOW TO PLAY')
    arrow('ArrowDown')
    expect(document.activeElement?.textContent).toBe('SETTINGS')
    arrow('ArrowUp')
    expect(document.activeElement?.textContent).toBe('HOW TO PLAY')

    // 좌우도 같은 순서로 움직인다. 로비에서는 판정 키가 살아 있지 않다.
    arrow('ArrowRight')
    expect(document.activeElement?.textContent).toBe('SETTINGS')
  })

  it('wraps around at both ends of the lobby buttons', () => {
    renderScreen({ playIntro: false })
    const arrow = (key: string) =>
      act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key })))

    // 첫 버튼에서 위로 가면 마지막으로 돈다.
    arrow('ArrowUp')
    const last = document.activeElement?.textContent
    expect(last).toBeTruthy()
    expect(last).not.toBe('START SHIFT')

    arrow('ArrowDown')
    expect(document.activeElement?.textContent).toBe('START SHIFT')
  })

  it('stops arrow navigation while a modal is open', () => {
    renderScreen({ playIntro: false })
    const howToPlay = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'HOW TO PLAY')
    act(() => howToPlay?.click())

    const before = document.activeElement
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' })))

    // 모달 안에 있는 포커스를 뒤쪽 로비로 끌고 가면 안 된다.
    expect(document.activeElement).toBe(before)
  })

  it('starts directly in the lobby on a return visit', () => {
    renderScreen({ playIntro: false })
    expect(container.querySelector('.lobby-scene')?.getAttribute('data-lobby-phase')).toBe('LOBBY')
    expect(handlers.onIntroComplete).not.toHaveBeenCalled()
    expect(document.activeElement?.textContent).toBe('START SHIFT')
  })
})
