import { describe, expect, it, vi } from 'vitest'

import {
  AudioEngine,
  BGM_VOLUME,
  VOLUME_PERCENT,
  type BgmElement,
  type BgmFactory,
  type ToneKind,
} from './audio'
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

/**
 * 배경음. 규칙은 `prompts/08_BGM_INTEGRATION_FINAL_HANDOFF.md`.
 *
 * 실제 소리는 기계가 들을 수 없다. 여기서 지키는 것은 **곡이 겹치지 않는
 * 것**과 **재렌더마다 새로 만들지 않는 것**이다. 둘 다 눈으로는 "가끔
 * 이상하다"로만 보여서 손으로 잡기 어렵다.
 */
describe('AudioEngine 배경음', () => {
  function createBgmStub() {
    const created: BgmElement[] = []
    const factory = vi.fn((src: string) => {
      const element: BgmElement = {
        loop: false,
        volume: 1,
        currentTime: 0,
        src,
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
      }
      created.push(element)

      return element
    })

    return { factory, created }
  }

  const engineWith = (factory: BgmFactory) =>
    new AudioEngine(() => null, factory)

  const audible = { paused: false, muted: false, volume: DEFAULTS.volumeStep }

  it('음소거 중에는 만들지도 재생하지도 않는다', () => {
    const { factory } = createBgmStub()

    engineWith(factory).syncBgm('LOBBY', { ...audible, muted: true })

    expect(factory).not.toHaveBeenCalled()
  })

  it('같은 곡을 다시 맞춰도 새로 만들지 않는다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('PLAY', audible)
    engine.syncBgm('PLAY', audible)
    engine.syncBgm('PLAY', audible)

    // 재렌더마다 새로 만들면 곡이 겹쳐서 들린다.
    expect(factory).toHaveBeenCalledTimes(1)
    expect(created).toHaveLength(1)
  })

  it('곡이 바뀌면 이전 곡을 멈추고 0초로 되돌린다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('PLAY', audible)
    created[0].currentTime = 12
    engine.syncBgm('LAST_LINE', audible)

    expect(created).toHaveLength(2)
    expect(created[0].pause).toHaveBeenCalled()
    expect(created[0].currentTime).toBe(0)
    expect(created[1].play).toHaveBeenCalled()
    expect(created[1].src).toContain('critical-heart')
  })

  it('일시정지는 위치를 지킨다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('PLAY', audible)
    created[0].currentTime = 7
    engine.syncBgm('PLAY', { ...audible, paused: true })

    expect(created[0].pause).toHaveBeenCalled()
    expect(created[0].currentTime).toBe(7)
  })

  it('재개는 같은 요소를 그 자리에서 잇는다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('PLAY', audible)
    created[0].currentTime = 7
    engine.syncBgm('PLAY', { ...audible, paused: true })
    engine.syncBgm('PLAY', audible)

    expect(factory).toHaveBeenCalledTimes(1)
    expect(created[0].currentTime).toBe(7)
  })

  it('음소거는 일시정지와 같게 다룬다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('PLAY', audible)
    created[0].currentTime = 5
    engine.syncBgm('PLAY', { ...audible, muted: true })

    expect(created[0].pause).toHaveBeenCalled()
    expect(created[0].currentTime).toBe(5)
  })

  it('null이면 멈추고 0초로 되돌린다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('PLAY', audible)
    created[0].currentTime = 20
    engine.syncBgm(null, audible)

    expect(created[0].pause).toHaveBeenCalled()
    expect(created[0].currentTime).toBe(0)
  })

  it('정지한 뒤 다시 맞추면 처음부터 새로 시작한다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('LOBBY', audible)
    engine.syncBgm(null, audible)
    engine.syncBgm('LOBBY', audible)

    expect(created).toHaveLength(2)
    expect(created[1].currentTime).toBe(0)
  })

  it('다섯 단계가 정해진 음량과 대응한다', () => {
    for (const [step, expected] of BGM_VOLUME.entries()) {
      const { factory, created } = createBgmStub()
      engineWith(factory).syncBgm('PLAY', {
        ...audible,
        volume: step as VolumeLevel,
      })

      expect(created[0].volume).toBe(expected)
    }
  })

  /**
   * **효과음과 크기를 숫자로 견줄 수 없다.** 효과음의 `PEAK_BY_VOLUME`은
   * 오실레이터에 거는 게인이고 배경음 값은 WAV 파일에 곱하는 볼륨이라,
   * 파일 자체의 진폭을 모르면 어느 쪽이 크게 들리는지 알 수 없다.
   *
   * "음악 위에서 판정 소리가 선명한가"는 **귀로만 확인된다.**
   * `QA_CHECKLIST` 17절에 사람 검사로 두었다. 여기서는 눈금이 실제로
   * 층이 지는지만 본다.
   */
  it('다섯 단계가 층이 진다', () => {
    expect(BGM_VOLUME).toHaveLength(VOLUME_STEPS)
    expect(new Set(BGM_VOLUME).size).toBe(VOLUME_STEPS)
    expect([...BGM_VOLUME].sort((a, b) => a - b)).toEqual([...BGM_VOLUME])
    expect(BGM_VOLUME[0]).toBeGreaterThan(0)
  })

  it('반복 재생으로 만든다', () => {
    const { factory, created } = createBgmStub()

    engineWith(factory).syncBgm('LOBBY', audible)

    expect(created[0].loop).toBe(true)
  })

  it('재생이 거절당해도 밖으로 던지지 않는다', () => {
    const factory: BgmFactory = () => ({
      loop: false,
      volume: 1,
      currentTime: 0,
      src: '',
      play: () => Promise.reject(new Error('autoplay blocked')),
      pause: vi.fn(),
    })

    // 첫 사용자 제스처 전에는 막히는 것이 정상이다. 판은 계속 굴러야 한다.
    expect(() => engineWith(factory).syncBgm('LOBBY', audible)).not.toThrow()
  })

  it('요소를 만들 수 없는 환경에서도 넘어간다', () => {
    expect(() => engineWith(() => null).syncBgm('LOBBY', audible)).not.toThrow()
  })

  it('disable이 배경음까지 정리한다', () => {
    const { factory, created } = createBgmStub()
    const engine = engineWith(factory)

    engine.syncBgm('PLAY', audible)
    created[0].currentTime = 9
    engine.disable()

    expect(created[0].pause).toHaveBeenCalled()
    expect(created[0].currentTime).toBe(0)
  })
})
