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

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextId
      nextId += 1
      callbacks.set(id, callback)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', cancel)

    return {
      cancel,
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
    act(() => {
      animation.frame(0)
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
    act(() => {
      animation.frame(0)
      animation.frame(50)
    })
    expect(onTick).toHaveBeenLastCalledWith(50)

    act(() => {
      root.render(<GameLoopHarness isRunning={false} {...options} />)
    })
    act(() => {
      root.render(<GameLoopHarness isRunning {...options} />)
    })
    act(() => {
      animation.frame(1_000)
      animation.frame(1_020)
    })

    expect(onTick).toHaveBeenLastCalledWith(20)
    expect(animation.cancel).toHaveBeenCalled()
  })
})
