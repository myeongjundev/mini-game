import { describe, expect, it, vi } from 'vitest'

import { AudioEngine, VOLUME_PERCENT, type ToneKind } from './audio'
import { DEFAULTS, VOLUME_STEPS, type VolumeLevel } from './storage'

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

describe('소리 크기 눈금', () => {
  /** 램프의 목표값이 곧 그 단계의 최고 음량이다. */
  const peakOf = (volume: VolumeLevel) => {
    const stub = createAudioStub()
    new AudioEngine(() => stub.context).play('CORRECT', false, volume)
    return stub.gain.gain.exponentialRampToValueAtTime.mock.calls[0][0] as number
  }

  it('단계마다 실제로 커진다', () => {
    const peaks = VOLUME_PERCENT.map((_, index) => peakOf(index as VolumeLevel))

    expect(peaks).toHaveLength(VOLUME_STEPS)
    // 같은 값이 이웃하면 눈금은 움직이는데 소리는 그대로인 셈이 된다.
    expect(new Set(peaks).size).toBe(VOLUME_STEPS)
    expect([...peaks].sort((a, b) => a - b)).toEqual(peaks)
    // 지수 램프는 0을 목표로 삼을 수 없다.
    expect(peaks[0]).toBeGreaterThan(0)
  })

  it('보이는 백분율과 실제 음량 비가 같다', () => {
    const top = peakOf((VOLUME_STEPS - 1) as VolumeLevel)

    for (const [index, percent] of VOLUME_PERCENT.entries()) {
      expect(peakOf(index as VolumeLevel) / top).toBeCloseTo(percent / 100, 5)
    }
  })

  it('기본값은 3단계 시절의 MID와 거의 같은 크기다', () => {
    // 쓰던 사람에게 소리가 갑자기 달라지지 않아야 한다.
    expect(peakOf(DEFAULTS.volumeStep)).toBeCloseTo(0.08, 2)
  })

  it('눈금 밖의 값이 와도 기본값으로 소리를 낸다', () => {
    expect(peakOf(99 as VolumeLevel)).toBe(peakOf(DEFAULTS.volumeStep))
  })
})
