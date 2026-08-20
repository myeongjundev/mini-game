import type { VolumeLevel } from './storage'

export type ToneKind = 'CORRECT' | 'INCORRECT' | 'CRITICAL'

export type AudioContextFactory = () => AudioContext | null

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

function createBrowserAudioContext(): AudioContext | null {
  try {
    return typeof globalThis.AudioContext === 'function'
      ? new globalThis.AudioContext()
      : null
  } catch {
    return null
  }
}

export class AudioEngine {
  private context: AudioContext | null = null
  private readonly activeVoices = new Set<ActiveVoice>()

  constructor(private readonly createContext: AudioContextFactory) {}

  enable(): void {
    const context = this.getContext()

    if (context?.state === 'suspended') {
      void context.resume().catch(() => undefined)
    }
  }

  /**
   * 단계별 최고 음량. MID가 지금까지 쓰던 0.08이라 기본값에서는 소리가
   * 달라지지 않는다. 지수 램프를 쓰므로 0이 될 수 없다.
   */
  private static readonly PEAK_BY_VOLUME = [0.04, 0.08, 0.14] as const

  play(kind: ToneKind, muted: boolean, volume: VolumeLevel = 1): void {
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
      const peak = AudioEngine.PEAK_BY_VOLUME[volume] ?? AudioEngine.PEAK_BY_VOLUME[1]
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
