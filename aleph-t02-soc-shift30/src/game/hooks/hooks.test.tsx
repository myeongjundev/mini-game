// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DIFFICULTY } from '../config'
import { useGameLoop, type UseGameLoopOptions } from './useGameLoop'
import { useKeyboard, type KeyboardHandlers } from './useKeyboard'
import { useVisibilityPause } from './useVisibilityPause'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function KeyboardHarness({
  enabled,
  handlers,
}: {
  enabled: boolean
  handlers: KeyboardHandlers
}) {
  useKeyboard(enabled, handlers)
  return null
}

function VisibilityHarness({
  isPlaying,
  onPause,
}: {
  isPlaying: boolean
  onPause: () => void
}) {
  useVisibilityPause(isPlaying, onPause)
  return null
}

function GameLoopHarness(options: UseGameLoopOptions) {
  useGameLoop(options)
  return null
}

describe('useKeyboard', () => {
  it('uses key and code, ignores repeats, and prevents only game keys', () => {
    const handlers = {
      onAllow: vi.fn(),
      onBlock: vi.fn(),
      onPauseToggle: vi.fn(),
    }

    act(() => {
      root.render(<KeyboardHarness enabled handlers={handlers} />)
    })

    const repeated = new KeyboardEvent('keydown', {
      key: 'a',
      code: 'KeyA',
      repeat: true,
      cancelable: true,
    })
    window.dispatchEvent(repeated)
    expect(handlers.onAllow).not.toHaveBeenCalled()
    expect(repeated.defaultPrevented).toBe(false)

    const codeFallback = new KeyboardEvent('keydown', {
      key: 'ㅁ',
      code: 'KeyA',
      cancelable: true,
    })
    window.dispatchEvent(codeFallback)
    expect(handlers.onAllow).toHaveBeenCalledOnce()
    expect(codeFallback.defaultPrevented).toBe(true)

    const unknown = new KeyboardEvent('keydown', {
      key: 'x',
      code: 'KeyX',
      cancelable: true,
    })
    window.dispatchEvent(unknown)
    expect(unknown.defaultPrevented).toBe(false)
  })

  it('removes the keydown listener when disabled', () => {
    const handlers = {
      onAllow: vi.fn(),
      onBlock: vi.fn(),
      onPauseToggle: vi.fn(),
    }

    act(() => {
      root.render(<KeyboardHarness enabled handlers={handlers} />)
    })
    act(() => {
      root.render(<KeyboardHarness enabled={false} handlers={handlers} />)
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))

    expect(handlers.onAllow).not.toHaveBeenCalled()
  })

  it('updates handlers without re-registering the keydown listener', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const firstHandlers = {
      onAllow: vi.fn(),
      onBlock: vi.fn(),
      onPauseToggle: vi.fn(),
    }
    const nextHandlers = {
      onAllow: vi.fn(),
      onBlock: vi.fn(),
      onPauseToggle: vi.fn(),
    }

    act(() => {
      root.render(<KeyboardHarness enabled handlers={firstHandlers} />)
    })
    act(() => {
      root.render(<KeyboardHarness enabled handlers={nextHandlers} />)
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))

    expect(
      addListener.mock.calls.filter(([type]) => type === 'keydown'),
    ).toHaveLength(1)
    expect(
      removeListener.mock.calls.filter(([type]) => type === 'keydown'),
    ).toHaveLength(0)
    expect(firstHandlers.onAllow).not.toHaveBeenCalled()
    expect(nextHandlers.onAllow).toHaveBeenCalledOnce()
  })
})

describe('useVisibilityPause', () => {
  it('pauses on hidden and blur, then removes both listeners', () => {
    const onPause = vi.fn()
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })

    act(() => {
      root.render(<VisibilityHarness isPlaying onPause={onPause} />)
    })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('blur'))
    expect(onPause).toHaveBeenCalledTimes(2)

    act(() => {
      root.render(<VisibilityHarness isPlaying={false} onPause={onPause} />)
    })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('blur'))
    expect(onPause).toHaveBeenCalledTimes(2)
  })
})

describe('useGameLoop', () => {
  function installAnimationFrameStub() {
    let nextId = 1
    const callbacks = new Map<number, FrameRequestCallback>()
    const cancel = vi.fn((id: number) => callbacks.delete(id))
    const now = vi.spyOn(performance, 'now')

    const request = vi.fn((callback: FrameRequestCallback) => {
      const id = nextId
      nextId += 1
      callbacks.set(id, callback)
      return id
    })
    vi.stubGlobal('requestAnimationFrame', request)
    vi.stubGlobal('cancelAnimationFrame', cancel)

    return {
      cancel,
      pendingCount: () => callbacks.size,
      request,
      frame(time: number) {
        now.mockReturnValue(time)
        const pending = [...callbacks.values()]
        callbacks.clear()
        pending.forEach((callback) => callback(time))
      },
    }
  }

  it('caps frame delta and schedules timeout in the same rAF loop', () => {
    const animation = installAnimationFrameStub()
    const onTick = vi.fn()
    const onTimeout = vi.fn()

    act(() => {
      root.render(
        <GameLoopHarness
          isRunning
          currentAlertId="alert-1"
          onTick={onTick}
          onTimeout={onTimeout}
        />,
      )
    })
    expect(animation.pendingCount()).toBe(1)
    act(() => {
      animation.frame(0)
    })
    expect(animation.pendingCount()).toBe(1)
    expect(onTick).not.toHaveBeenCalled()
    act(() => {
      animation.frame(500)
    })
    expect(onTick).toHaveBeenLastCalledWith(100)

    act(() => {
      for (let time = 600; time <= DIFFICULTY.eventIntervalMs + 400; time += 100) {
        animation.frame(time)
      }
    })
    expect(onTimeout).toHaveBeenCalledOnce()
  })

  it('cancels rAF and resets the previous frame time when stopped', () => {
    const animation = installAnimationFrameStub()
    const onTick = vi.fn()
    const options = {
      currentAlertId: 'alert-1',
      onTick,
      onTimeout: vi.fn(),
    }

    act(() => {
      root.render(<GameLoopHarness isRunning {...options} />)
    })
    expect(animation.pendingCount()).toBe(1)
    act(() => {
      animation.frame(0)
    })
    expect(animation.pendingCount()).toBe(1)
    expect(onTick).not.toHaveBeenCalled()
    act(() => {
      animation.frame(50)
    })
    expect(onTick).toHaveBeenLastCalledWith(50)

    act(() => {
      root.render(<GameLoopHarness isRunning={false} {...options} />)
    })
    act(() => {
      root.render(<GameLoopHarness isRunning {...options} />)
    })
    expect(animation.pendingCount()).toBe(1)
    act(() => {
      animation.frame(1_000)
    })
    expect(animation.pendingCount()).toBe(1)
    act(() => {
      animation.frame(1_020)
    })

    expect(onTick).toHaveBeenLastCalledWith(20)
    expect(animation.cancel).toHaveBeenCalled()
  })

  it('keeps frame deltas continuous when the current alert changes', () => {
    const animation = installAnimationFrameStub()
    const onTick = vi.fn()
    const options = {
      isRunning: true,
      onTick,
      onTimeout: vi.fn(),
    }

    act(() => {
      root.render(
        <GameLoopHarness currentAlertId="alert-1" {...options} />,
      )
    })
    expect(animation.pendingCount()).toBe(1)
    act(() => {
      animation.frame(100)
    })
    expect(animation.pendingCount()).toBe(1)
    expect(onTick).not.toHaveBeenCalled()
    act(() => {
      animation.frame(150)
    })
    expect(onTick).toHaveBeenLastCalledWith(50)

    const requestCount = animation.request.mock.calls.length
    const cancelCount = animation.cancel.mock.calls.length
    act(() => {
      root.render(
        <GameLoopHarness currentAlertId="alert-2" {...options} />,
      )
    })

    expect(animation.request).toHaveBeenCalledTimes(requestCount)
    expect(animation.cancel).toHaveBeenCalledTimes(cancelCount)
    expect(animation.pendingCount()).toBe(1)
    act(() => {
      animation.frame(200)
    })
    expect(onTick).toHaveBeenLastCalledWith(50)
  })

  it('freezes the alert clock while a memo is open but keeps ticking', () => {
    // 경보 한 장의 수명은 1.4초다. 메모를 읽고 닫는 데만 그 이상이 드니
    // 멈추지 않으면 메모가 뜬 경보는 실력과 무관하게 미판정이 된다.
    const animation = installAnimationFrameStub()
    const onTick = vi.fn()
    const onTimeout = vi.fn()
    const options = {
      isRunning: true,
      currentAlertId: 'alert-1',
      onTick,
      onTimeout,
    }
    const frozenUntil = DIFFICULTY.eventIntervalMs + 2_000

    act(() => {
      root.render(<GameLoopHarness isAlertClockFrozen {...options} />)
    })
    act(() => {
      animation.frame(0)
    })
    act(() => {
      for (let time = 100; time <= frozenUntil; time += 100) {
        animation.frame(time)
      }
    })

    // 30초 근무 시계는 계속 흐르지만 경보는 만료되지 않는다.
    expect(onTick).toHaveBeenCalled()
    expect(onTimeout).not.toHaveBeenCalled()

    act(() => {
      root.render(<GameLoopHarness isAlertClockFrozen={false} {...options} />)
    })
    act(() => {
      for (
        let time = frozenUntil + 100;
        time <= frozenUntil + DIFFICULTY.eventIntervalMs + 400;
        time += 100
      ) {
        animation.frame(time)
      }
    })

    // 닫은 뒤에야 제한 시간이 흐르기 시작한다.
    expect(onTimeout).toHaveBeenCalledOnce()
  })
})
