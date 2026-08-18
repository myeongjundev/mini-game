import { describe, expect, it, vi } from 'vitest'

import { AudioEngine, type ToneKind } from './audio'

function createAudioStub() {
  const oscillator = {
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
    addEventListener: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
  const gain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  const context = {
    state: 'running',
    currentTime: 4,
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  } as unknown as AudioContext

  return { context, gain, oscillator }
}

describe('AudioEngine', () => {
  it('does not create an AudioContext while muted', () => {
    const createContext = vi.fn(() => createAudioStub().context)
    const engine = new AudioEngine(createContext)

    engine.play('CORRECT', true)

    expect(createContext).not.toHaveBeenCalled()
  })

  it.each<ToneKind>(['CORRECT', 'INCORRECT', 'CRITICAL'])(
    'creates a Web Audio oscillator for the %s tone',
    (kind) => {
      const stub = createAudioStub()
      const engine = new AudioEngine(() => stub.context)

      engine.play(kind, false)

      expect(stub.oscillator.start).toHaveBeenCalledOnce()
      expect(stub.oscillator.stop).toHaveBeenCalledOnce()
      expect(stub.gain.connect).toHaveBeenCalledOnce()
    },
  )

  it('closes the context when disabled', () => {
    const stub = createAudioStub()
    const engine = new AudioEngine(() => stub.context)
    engine.play('CORRECT', false)
    engine.disable()

    expect(stub.oscillator.disconnect).toHaveBeenCalledOnce()
    expect(stub.gain.disconnect).toHaveBeenCalledOnce()
    expect(stub.context.close).toHaveBeenCalledOnce()
  })
})
