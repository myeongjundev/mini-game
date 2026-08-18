export const STORAGE_KEY = 'socshift30:v1'

export type Saved = {
  v: 1
  bestScore: number
  mute: boolean
  reduceMotion: boolean
}

export const DEFAULTS: Readonly<Saved> = {
  v: 1,
  bestScore: 0,
  mute: true,
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
