// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { ALERTS } from './game/data/alerts'
import { MAX_FRAME_DELTA_MS } from './game/hooks/useGameLoop'
import { audioEngine } from './services/audio'
import type { BgmKind } from './services/audio'

/**
 * 배경음이 화면 상태를 따라오는지. 규칙은
 * `prompts/08_BGM_INTEGRATION_FINAL_HANDOFF.md` 2절.
 *
 * 실제 소리는 기계가 들을 수 없다. 여기서 지키는 것은 **어느 곡을 요청하는가**
 * 하나다. 재시작·탭 이탈·라이프 소진이 전부 다른 경로라, 전환마다 명령을
 * 내리는 방식이면 빠뜨린 경로에서 곡이 남는다.
 */
describe('배경음 상태 연결', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let now = 0
  const frames: FrameRequestCallback[] = []
  let sync: ReturnType<typeof vi.spyOn>

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
    sync = vi.spyOn(audioEngine, 'syncBgm').mockImplementation(() => undefined)
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

  const title = () => container.querySelector('.alert-card h2')?.textContent

  /** 마지막으로 요청한 곡. */
  const requested = (): BgmKind | null => {
    const call = sync.mock.calls.at(-1)

    return (call?.[0] ?? null) as BgmKind | null
  }

  const lastOptions = () =>
    sync.mock.calls.at(-1)?.[1] as
      | { paused: boolean; muted: boolean; volume: number }
      | undefined

  const clickButton = (label: string) => {
    const button = [...container.querySelectorAll('button')].find(
      (item) => item.textContent === label,
    )
    act(() => button?.click())
  }

  const start = () => {
    act(() => root.render(<App />))
    press('Enter')
    clickButton('START SHIFT')
    frame(MAX_FRAME_DELTA_MS)
  }

  /** 떠 있는 경보의 오답을 눌러 라이프를 하나 깎는다. */
  const answerWrong = () => {
    const current = ALERTS.find((alert) => alert.title === title())
    if (current) press(current.correctAction === 'ALLOW' ? 'd' : 'a')
    frame(MAX_FRAME_DELTA_MS)
  }

  it('로비에서는 로비곡을 고른다', () => {
    act(() => root.render(<App />))

    expect(requested()).toBe('LOBBY')
  })

  it('첫 로드는 음소거라 재생을 요청하지 않는다', () => {
    act(() => root.render(<App />))

    // 자동 재생 정책. 저장값이 음소거이므로 소리를 낼 수 없다고 알린다.
    expect(lastOptions()?.muted).toBe(true)
  })

  it('근무를 시작하면 플레이곡으로 바뀐다', () => {
    start()

    expect(requested()).toBe('PLAY')
  })

  it('라이프가 1이 되면 위기곡으로 바뀐다', () => {
    start()

    answerWrong()
    expect(requested()).toBe('PLAY')

    answerWrong()
    expect(requested()).toBe('LAST_LINE')
  })

  it('일시정지는 곡을 바꾸지 않고 멈추기만 한다', () => {
    start()
    press('p')

    expect(requested()).toBe('PLAY')
    expect(lastOptions()?.paused).toBe(true)

    press('p')

    expect(requested()).toBe('PLAY')
    expect(lastOptions()?.paused).toBe(false)
  })

  it('근무가 끝나면 곡을 내린다', () => {
    start()

    answerWrong()
    answerWrong()
    answerWrong()

    expect(container.querySelector('.result-screen')).not.toBeNull()
    expect(requested()).toBeNull()
  })

  it('다시 시작하면 로비곡으로 돌아간다', () => {
    start()
    answerWrong()
    answerWrong()
    answerWrong()
    clickButton('RETURN TO READY')

    expect(requested()).toBe('LOBBY')
  })

  it('소리를 켜면 즉시 반영된다', () => {
    act(() => root.render(<App />))
    // 인트로를 건너뛰어야 로비 메뉴가 나온다.
    press('Enter')
    expect(lastOptions()?.muted).toBe(true)

    const sound = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('SOUND'),
    )
    expect(sound).toBeDefined()
    act(() => sound?.click())

    expect(lastOptions()?.muted).toBe(false)
    expect(requested()).toBe('LOBBY')
  })
})
