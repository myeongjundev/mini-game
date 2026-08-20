export const STORAGE_KEY = 'socshift30:v1'

/**
 * 소리 크기 단계. 0=LOW 1=MID 2=HIGH.
 * 끄는 것은 `mute`가 따로 맡는다. 볼륨 0을 끔으로 쓰면 "소리 켬인데 0"이라는
 * 모순된 상태가 생기고, 껐다 켤 때 이전 크기를 잃는다.
 */
export type VolumeLevel = 0 | 1 | 2

export type Saved = {
  v: 1
  bestScore: number
  mute: boolean
  volume: VolumeLevel
  reduceMotion: boolean
}

export const DEFAULTS: Readonly<Saved> = {
  v: 1,
  bestScore: 0,
  mute: true,
  volume: 1,
  reduceMotion: false,
}

export type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

function defaultSaved(defaults: Readonly<Saved> = DEFAULTS): Saved {
  return { ...defaults }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidBestScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 999_999
  )
}

function isValidVolume(value: unknown): value is VolumeLevel {
  return value === 0 || value === 1 || value === 2
}

export function loadSaved(
  storage?: StorageLike,
  defaults: Readonly<Saved> = DEFAULTS,
): Saved {
  try {
    const serialized = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY)

    if (serialized === null || serialized === '') {
      return defaultSaved(defaults)
    }

    const parsed: unknown = JSON.parse(serialized)

    if (!isRecord(parsed) || parsed.v !== 1) {
      return defaultSaved(defaults)
    }

    return {
      v: 1,
      bestScore: isValidBestScore(parsed.bestScore)
        ? parsed.bestScore
        : defaults.bestScore,
      mute: typeof parsed.mute === 'boolean' ? parsed.mute : defaults.mute,
      // v를 올리지 않고 필드만 더한다. 없는 값은 기본값으로 채워지므로
      // 예전 저장값의 최고 점수가 살아남는다.
      volume: isValidVolume(parsed.volume) ? parsed.volume : defaults.volume,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : defaults.reduceMotion,
    }
  } catch {
    return defaultSaved(defaults)
  }
}

export type MediaQueryMatcher = (query: string) => { matches: boolean }

export function loadInitialSaved(
  storage?: StorageLike,
  matcher?: MediaQueryMatcher,
): Saved {
  let prefersReducedMotion = false

  try {
    const matchMedia = matcher ?? globalThis.matchMedia?.bind(globalThis)
    prefersReducedMotion =
      matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  } catch {
    // Media-query access failure falls back to the documented default.
  }

  return loadSaved(storage, {
    ...DEFAULTS,
    reduceMotion: prefersReducedMotion,
  })
}

export function saveSaved(saved: Saved, storage?: StorageLike): void {
  try {
    ;(storage ?? globalThis.localStorage).setItem(
      STORAGE_KEY,
      JSON.stringify(saved),
    )
  } catch {
    // Storage failure must not interrupt the game.
  }
}
