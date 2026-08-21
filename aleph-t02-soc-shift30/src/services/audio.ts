import { DEFAULTS, VOLUME_STEPS, type VolumeLevel } from './storage'

export type ToneKind = 'CORRECT' | 'INCORRECT' | 'CRITICAL'

/** 배경음 세 곡. 규칙은 `prompts/08_BGM_INTEGRATION_FINAL_HANDOFF.md` 2절. */
export type BgmKind = 'LOBBY' | 'PLAY' | 'LAST_LINE'

export const BGM_FILE: Readonly<Record<BgmKind, string>> = {
  LOBBY: 'audio/soc-shift-lobby-loop.wav',
  PLAY: 'audio/soc-shift-play-loop.wav',
  LAST_LINE: 'audio/soc-shift-critical-heart-loop.wav',
}

/**
 * 배경음의 단계별 음량. 판정 효과음(`PEAK_BY_VOLUME`)보다 낮아야 한다.
 * 소리 크기 눈금은 효과음과 **같은 것을 쓴다.** 배경음 전용 설정을 만들지
 * 않는다.
 */
export const BGM_VOLUME = [0.04, 0.08, 0.12, 0.16, 0.2] as const

/**
 * 배경음 재생기가 갖춰야 할 것. `HTMLAudioElement`가 이 모양을 이미 만족한다.
 * 검사에서 갈아끼우려고 좁혀 두었다.
 */
export type BgmElement = {
  loop: boolean
  volume: number
  currentTime: number
  src: string
  play: () => Promise<void> | void
  pause: () => void
}

export type AudioContextFactory = () => AudioContext | null

export type BgmFactory = (src: string) => BgmElement | null

type ActiveVoice = {
  oscillator: OscillatorNode
  gain: GainNode
}

const TONES: Record<
  ToneKind,
  { frequency: number; durationSeconds: number; type: OscillatorType }
> = {
  CORRECT: { frequency: 660, durationSeconds: 0.09, type: 'sine' },
  INCORRECT: { frequency: 180, durationSeconds: 0.14, type: 'square' },
  CRITICAL: { frequency: 880, durationSeconds: 0.12, type: 'triangle' },
}

/** 가장 큰 단계의 음량. 지수 램프를 쓰므로 0이 될 수 없다. */
const MAX_PEAK = 0.14

/**
 * 설정 화면에 보여줄 백분율. 눈금을 고르게 나눈다.
 *
 * 보이는 숫자와 실제 음량이 어긋나지 않도록 **표시가 먼저고 음량이 따라온다.**
 * 반대로 두면 손으로 적은 백분율이 음량표만 바뀔 때 조용히 거짓말이 된다.
 */
export const VOLUME_PERCENT = Array.from(
  { length: VOLUME_STEPS },
  (_, index) => Math.round(((index + 1) / VOLUME_STEPS) * 100),
)

/**
 * 단계별 최고 음량. 기본값(가운데, 60%)이 0.084로 3단계 시절의 MID 0.08과
 * 거의 같아서 쓰던 사람에게는 소리가 그대로다.
 */
export const PEAK_BY_VOLUME = VOLUME_PERCENT.map(
  (percent) => (percent / 100) * MAX_PEAK,
)

function createBrowserAudioContext(): AudioContext | null {
  try {
    return typeof globalThis.AudioContext === 'function'
      ? new globalThis.AudioContext()
      : null
  } catch {
    return null
  }
}

function createBrowserBgm(src: string): BgmElement | null {
  try {
    if (typeof globalThis.Audio !== 'function') {
      return null
    }

    const element = new globalThis.Audio(src)
    element.loop = true
    element.preload = 'auto'

    return element
  } catch {
    return null
  }
}

export class AudioEngine {
  private context: AudioContext | null = null
  private readonly activeVoices = new Set<ActiveVoice>()
  private bgm: BgmElement | null = null
  private bgmKind: BgmKind | null = null

  constructor(
    private readonly createContext: AudioContextFactory,
    private readonly createBgm: BgmFactory = createBrowserBgm,
  ) {}

  /**
   * 지금 상태에 맞는 배경음을 맞춘다. 시작·교체·일시정지·정지를 한 곳에서
   * 결정하므로 화면과 소리가 어긋날 자리가 없다.
   *
   * `kind`가 null이면 정지하고 0초로 되돌린다. 곡이 바뀌면 이전 곡을 정지·
   * 초기화한 뒤 새 곡을 0초부터 시작한다. **같은 곡이면 요소를 다시 만들지
   * 않는다** — 재렌더마다 새로 만들면 곡이 겹친다.
   *
   * 음소거와 일시정지는 똑같이 다룬다. 위치를 지킨 채 멈추고, 풀리면 그
   * 자리에서 이어간다.
   *
   * 자동 재생 정책(인계서 5절): `play()`가 거절당해도 삼킨다. 첫 사용자
   * 제스처 전에는 막히는 것이 정상이고, 그래도 판은 계속 굴러가야 한다.
   */
  syncBgm(
    kind: BgmKind | null,
    options: { paused: boolean; muted: boolean; volume: VolumeLevel },
  ): void {
    if (kind === null) {
      this.stopBgm()

      return
    }

    if (this.bgmKind !== kind) {
      this.stopBgm()
      this.bgmKind = kind
    }

    const silent = options.muted || options.paused

    if (this.bgm === null) {
      // 음소거 중에는 만들지도 않는다. 소리를 낼 수 없는데 파일만 받는다.
      if (silent) {
        return
      }

      this.bgm = this.createBgm(
        `${import.meta.env.BASE_URL}${BGM_FILE[kind]}`,
      )

      if (this.bgm === null) {
        return
      }

      this.bgm.loop = true
    }

    this.bgm.volume = BGM_VOLUME[options.volume] ?? BGM_VOLUME[DEFAULTS.volumeStep]

    try {
      if (silent) {
        this.bgm.pause()

        return
      }

      const started = this.bgm.play()

      if (started && typeof started.then === 'function') {
        void started.catch(() => undefined)
      }
    } catch {
      // 재생 실패가 판을 멈추게 하면 안 된다.
    }
  }

  /** 곡을 멈추고 0초로 되돌린다. 근무가 끝났을 때 쓴다. */
  stopBgm(): void {
    const element = this.bgm
    this.bgm = null
    this.bgmKind = null

    if (element === null) {
      return
    }

    try {
      element.pause()
      element.currentTime = 0
    } catch {
      // 이미 정리된 요소일 수 있다.
    }
  }

  enable(): void {
    const context = this.getContext()

    if (context?.state === 'suspended') {
      void context.resume().catch(() => undefined)
    }
  }

  play(
    kind: ToneKind,
    muted: boolean,
    volume: VolumeLevel = DEFAULTS.volumeStep,
  ): void {
    if (muted) {
      return
    }

    const context = this.getContext()

    if (context === null) {
      return
    }

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined)
    }

    try {
      const tone = TONES[kind]
      const peak = PEAK_BY_VOLUME[volume] ?? PEAK_BY_VOLUME[DEFAULTS.volumeStep]
      const now = context.currentTime
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const voice = { oscillator, gain }
      const cleanup = () => {
        this.activeVoices.delete(voice)
        try {
          oscillator.disconnect()
          gain.disconnect()
        } catch {
          // A node may already have been disconnected by mute or unmount.
        }
      }

      oscillator.type = tone.type
      oscillator.frequency.setValueAtTime(tone.frequency, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + tone.durationSeconds,
      )
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.addEventListener('ended', cleanup, { once: true })
      this.activeVoices.add(voice)
      oscillator.start(now)
      oscillator.stop(now + tone.durationSeconds)
    } catch {
      // Audio support must never interrupt the game loop.
    }
  }

  disable(): void {
    this.stopBgm()

    for (const { oscillator, gain } of this.activeVoices) {
      try {
        oscillator.stop()
        oscillator.disconnect()
        gain.disconnect()
      } catch {
        // A node may already have ended.
      }
    }
    this.activeVoices.clear()

    const context = this.context
    this.context = null

    if (context !== null && context.state !== 'closed') {
      void context.close().catch(() => undefined)
    }
  }

  private getContext(): AudioContext | null {
    if (this.context === null) {
      this.context = this.createContext()
    }

    return this.context
  }
}

export const audioEngine = new AudioEngine(createBrowserAudioContext)
