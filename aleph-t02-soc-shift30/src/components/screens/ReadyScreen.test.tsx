// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ReadyScreen, { type ReadyScreenProps } from './ReadyScreen'

const handlers = {
  onIntroComplete: vi.fn(),
  onStart: vi.fn(),
  onToggleMute: vi.fn(),
  onToggleReduceMotion: vi.fn(),
}

describe('ReadyScreen intro and lobby', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const renderScreen = (props: Partial<ReadyScreenProps> = {}) => {
    act(() => root.render(
      <ReadyScreen bestScore={900} mute reduceMotion={false} playIntro
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
    expect(container.textContent).toContain('개수가 아니라 어떤 항목인지')
    expect(container.querySelectorAll('.ready-example')).toHaveLength(2)
    expect(container.querySelectorAll('.suspicious-marker')).toHaveLength(3)
    expect(container.querySelector('.lobby-console')?.hasAttribute('aria-live')).toBe(false)
  })

  it('starts directly in the lobby on a return visit', () => {
    renderScreen({ playIntro: false })
    expect(container.querySelector('.lobby-scene')?.getAttribute('data-lobby-phase')).toBe('LOBBY')
    expect(handlers.onIntroComplete).not.toHaveBeenCalled()
    expect(document.activeElement?.textContent).toBe('START SHIFT')
  })
})
