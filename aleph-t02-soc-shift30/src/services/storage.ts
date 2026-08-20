export const STORAGE_KEY = 'socshift30:v1'

/** 소리 크기 눈금 수. 실제 음량은 `services/audio.ts`가 정한다. */
export const VOLUME_STEPS = 5

/**
 * 소리 크기 단계. 0이 가장 작고 `VOLUME_STEPS - 1`이 가장 크다.
 * 끄는 것은 `mute`가 따로 맡는다. 볼륨 0을 끔으로 쓰면 "소리 켬인데 0"이라는
 * 모순된 상태가 생기고, 껐다 켤 때 이전 크기를 잃는다.
 */
export type VolumeLevel = 0 | 1 | 2 | 3 | 4

export type Saved = {
  v: 1
  bestScore: number
  mute: boolean
  /**
   * 3단계이던 시절의 이름은 `volume`이었다. 눈금이 늘면서 같은 숫자 1이
   * 다른 크기를 뜻하게 되는데, 저장된 값만 봐서는 어느 시절 것인지 알 수
   * 없다. 이름을 바꿔 **없다는 것 자체를 표시로** 쓴다.
   */
  volumeStep: VolumeLevel
  reduceMotion: boolean
}

export const DEFAULTS: Readonly<Saved> = {
  v: 1,
  bestScore: 0,
  mute: true,
  volumeStep: 2,
  reduceMotion: false,
}

/** 옛 3단계(LOW·MID·HIGH)가 놓이는 자리. 가장 작은 값과 가장 큰 값을 지킨다. */
const LEGACY_VOLUME_TO_STEP: readonly VolumeLevel[] = [0, 2, 4]

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
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < VOLUME_STEPS
  )
}

/**
 * 저장된 크기를 지금 눈금으로 읽는다. 새 이름이 있으면 그대로 쓰고, 없으면
 * 옛 3단계 값을 옮긴다. 둘 다 없거나 망가졌으면 기본값이다.
 */
function readVolumeStep(
  parsed: Record<string, unknown>,
  fallback: VolumeLevel,
): VolumeLevel {
  if (isValidVolume(parsed.volumeStep)) {
    return parsed.volumeStep
  }

  const legacy = parsed.volume
  if (legacy === 0 || legacy === 1 || legacy === 2) {
    return LEGACY_VOLUME_TO_STEP[legacy]
  }

  return fallback
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
      volumeStep: readVolumeStep(parsed, defaults.volumeStep),
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
