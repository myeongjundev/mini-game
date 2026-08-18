// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App hook stability', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    localStorage.clear()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not re-register keydown across unrelated App renders', () => {
    const addListener = vi.spyOn(window, 'addEventListener')

    act(() => root.render(<App />))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    })
    const start = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'START SHIFT',
    )
    expect(start).toBeDefined()
    act(() => start?.click())

    const registrationsAfterGameStart = addListener.mock.calls.filter(
      ([type]) => type === 'keydown',
    ).length

    const sound = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('SOUND'),
    )
    expect(sound).toBeDefined()
    act(() => sound?.click())

    expect(
      addListener.mock.calls.filter(([type]) => type === 'keydown'),
    ).toHaveLength(registrationsAfterGameStart)
    // One listener belongs to the one-time intro, and one to the active game.
    expect(registrationsAfterGameStart).toBe(2)
  })
})
