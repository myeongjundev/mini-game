import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULTS,
  loadInitialSaved,
  loadSaved,
  saveSaved,
  STORAGE_KEY,
  VOLUME_STEPS,
  type StorageLike,
} from './storage'

function storageWith(value: string | null): StorageLike {
  return {
    getItem: () => value,
    setItem: () => undefined,
  }
}

describe('loadSaved corruption recovery table', () => {
  it('1. returns defaults when the key is missing', () => {
    expect(loadSaved(storageWith(null))).toEqual(DEFAULTS)
    expect(loadSaved(storageWith(null)).mute).toBe(true)
  })

  it('2. returns defaults for an empty string', () => {
    expect(loadSaved(storageWith(''))).toEqual(DEFAULTS)
  })

  it('3. returns defaults for plain text', () => {
    expect(loadSaved(storageWith('abc'))).toEqual(DEFAULTS)
  })

  it('4. returns defaults for malformed JSON', () => {
    expect(loadSaved(storageWith('{"bestScore":'))).toEqual(DEFAULTS)
  })

  it('5. recovers all missing fields from an empty object', () => {
    expect(loadSaved(storageWith('{}'))).toEqual(DEFAULTS)
  })

  it('6. recovers a bestScore with the wrong type', () => {
    expect(loadSaved(storageWith('{"v":1,"bestScore":"높음"}'))).toEqual(
      DEFAULTS,
    )
  })

  it('7. recovers a negative bestScore', () => {
    expect(loadSaved(storageWith('{"v":1,"bestScore":-5}'))).toEqual(DEFAULTS)
  })

  it('8. restores a valid saved value', () => {
    expect(
      loadSaved(
        storageWith(
          '{"v":1,"bestScore":2140,"mute":true,"reduceMotion":false}',
        ),
      ),
    ).toEqual({ v: 1, bestScore: 2140, mute: true, volumeStep: 2, reduceMotion: false })
  })
})

describe('initial accessibility settings', () => {
  it('starts muted and adopts the OS reduced-motion preference without saved data', () => {
    expect(loadInitialSaved(storageWith(null), () => ({ matches: true }))).toEqual({
      v: 1,
      bestScore: 0,
      mute: true,
      volumeStep: 2,
      reduceMotion: true,
    })
  })

  it('lets a valid saved reduce-motion choice override the OS preference', () => {
    expect(
      loadInitialSaved(
        storageWith(
          '{"v":1,"bestScore":10,"mute":false,"reduceMotion":false}',
        ),
        () => ({ matches: true }),
      ),
    ).toEqual({ v: 1, bestScore: 10, mute: false, volumeStep: 2, reduceMotion: false })
  })
})

describe('loadSaved additional boundary table', () => {
  it('returns all defaults for an unsupported version', () => {
    expect(loadSaved(storageWith('{"v":2,"bestScore":9999}'))).toEqual(DEFAULTS)
  })

  it('recovers a non-finite equivalent while preserving valid fields', () => {
    expect(
      loadSaved(
        storageWith(
          '{"v":1,"bestScore":1e309,"mute":true,"reduceMotion":true}',
        ),
      ),
    ).toEqual({ v: 1, bestScore: 0, mute: true, volumeStep: 2, reduceMotion: true })
  })

  it('returns defaults for an array', () => {
    expect(loadSaved(storageWith('[1,2,3]'))).toEqual(DEFAULTS)
  })

  it('returns defaults for null JSON', () => {
    expect(loadSaved(storageWith('null'))).toEqual(DEFAULTS)
  })

  it('swallows localStorage access errors without console.error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    )

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('blocked')
      },
    })

    try {
      expect(loadSaved()).toEqual(DEFAULTS)
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'localStorage', originalDescriptor)
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage')
      }
      consoleError.mockRestore()
    }
  })
})

describe('field-level and score boundary recovery', () => {
  it('preserves valid settings when only bestScore is corrupt', () => {
    expect(
      loadSaved(
        storageWith(
          '{"v":1,"bestScore":"높음","mute":true,"reduceMotion":true}',
        ),
      ),
    ).toEqual({ v: 1, bestScore: 0, mute: true, volumeStep: 2, reduceMotion: true })
  })

  it.each([0, 999_999])('accepts the inclusive score boundary %i', (bestScore) => {
    expect(
      loadSaved(storageWith(`{"v":1,"bestScore":${bestScore}}`)).bestScore,
    ).toBe(bestScore)
  })

  it.each([1_000_000, 1.5])('rejects an invalid score boundary %s', (bestScore) => {
    expect(
      loadSaved(storageWith(`{"v":1,"bestScore":${bestScore}}`)).bestScore,
    ).toBe(0)
  })
})

describe('saveSaved', () => {
  it('writes the versioned schema to the expected key', () => {
    const setItem = vi.fn()
    const storage: StorageLike = { getItem: () => null, setItem }
    const saved = { v: 1, bestScore: 300, mute: true, volumeStep: 2, reduceMotion: false } as const

    saveSaved(saved, storage)

    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(saved))
  })

  it('swallows blocked-storage write errors without console.error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const blocked: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked')
      },
    }

    expect(() => saveSaved({ ...DEFAULTS }, blocked)).not.toThrow()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('소리 크기 눈금', () => {
  const stepOf = (json: string) => loadSaved(storageWith(json)).volumeStep

  it('지금 이름으로 저장된 값을 그대로 읽는다', () => {
    expect(stepOf('{"v":1,"volumeStep":0}')).toBe(0)
    expect(stepOf(`{"v":1,"volumeStep":${VOLUME_STEPS - 1}}`)).toBe(VOLUME_STEPS - 1)
  })

  it('눈금 밖의 값은 기본값으로 떨어진다', () => {
    // 단계를 줄이는 날이 오면 저장된 큰 값이 여기로 온다.
    expect(stepOf(`{"v":1,"volumeStep":${VOLUME_STEPS}}`)).toBe(DEFAULTS.volumeStep)
    expect(stepOf('{"v":1,"volumeStep":-1}')).toBe(DEFAULTS.volumeStep)
    expect(stepOf('{"v":1,"volumeStep":1.5}')).toBe(DEFAULTS.volumeStep)
    expect(stepOf('{"v":1,"volumeStep":"HIGH"}')).toBe(DEFAULTS.volumeStep)
  })

  it('3단계이던 시절의 값을 옮겨 온다', () => {
    // 이름이 다르므로 옛 값인 줄 안다. 가장 작은 것과 가장 큰 것은 그대로다.
    expect(stepOf('{"v":1,"volume":0}')).toBe(0)
    expect(stepOf('{"v":1,"volume":1}')).toBe(DEFAULTS.volumeStep)
    expect(stepOf('{"v":1,"volume":2}')).toBe(VOLUME_STEPS - 1)
  })

  it('새 이름이 있으면 옛 이름은 보지 않는다', () => {
    expect(stepOf('{"v":1,"volumeStep":1,"volume":2}')).toBe(1)
  })

  it('옛 값과 함께 최고 점수도 살아남는다', () => {
    // 이름을 바꾼 것이 저장 형식 버전을 올린 것은 아니다.
    expect(loadSaved(storageWith('{"v":1,"bestScore":4200,"volume":2}'))).toEqual({
      ...DEFAULTS,
      bestScore: 4200,
      volumeStep: VOLUME_STEPS - 1,
    })
  })
})
