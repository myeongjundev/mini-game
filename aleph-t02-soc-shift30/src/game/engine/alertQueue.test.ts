import { afterEach, describe, expect, it, vi } from 'vitest'

import { ALERTS } from '../data/alerts'
import type { Alert, Tier } from '../types'
import {
  createAlertQueue,
  drawNextAlert,
  getTierForElapsedTime,
} from './alertQueue'

function alert(id: string, tier: Tier): Alert {
  return {
    id,
    tier,
    category: 'traffic',
    title: id,
    facts: [
      { label: 'ONE', value: '1' },
      { label: 'TWO', value: '2' },
      { label: 'THREE', value: '3' },
      { label: 'FOUR', value: '4' },
    ],
    correctAction: 'ALLOW',
    severity: 'LOW',
    explanation: id,
  }
}

const alerts = [
  alert('t1-a', 1),
  alert('t1-b', 1),
  alert('t2-a', 2),
  alert('t2-b', 2),
  alert('t3-a', 3),
  alert('t3-b', 3),
]

function drawIds(seed: number): string[] {
  let queue = createAlertQueue(alerts, seed)
  const ids: string[] = []

  for (const elapsedMs of [0, 0, 0, 10_000, 10_000, 20_000, 20_000]) {
    const draw = drawNextAlert(queue, elapsedMs)
    ids.push(draw.alert.id)
    queue = draw.queue
  }

  return ids
}

function drawDefaultTierOneIds(): string[] {
  let queue = createAlertQueue(alerts)
  const ids: string[] = []

  for (let count = 0; count < 2; count += 1) {
    const draw = drawNextAlert(queue, 0)
    ids.push(draw.alert.id)
    queue = draw.queue
  }

  return ids
}

describe('alert queue', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('selects tiers for each ten-second segment', () => {
    expect(getTierForElapsedTime(-1)).toBe(1)
    expect(getTierForElapsedTime(9_999)).toBe(1)
    expect(getTierForElapsedTime(10_000)).toBe(2)
    expect(getTierForElapsedTime(19_999)).toBe(2)
    expect(getTierForElapsedTime(20_000)).toBe(3)
  })

  it('produces the same order for the same seed', () => {
    expect(drawIds(42)).toEqual(drawIds(42))
  })

  it('uses a new runtime seed for each default queue', () => {
    const seeds = [1, 1_000]
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(
      (array) => {
        ;(array as Uint32Array)[0] = seeds.shift() ?? 0
        return array
      },
    )

    expect(drawDefaultTierOneIds()).not.toEqual(drawDefaultTierOneIds())
  })

  it('uses every alert in a tier before recycling it', () => {
    let queue = createAlertQueue(alerts, 7)
    const first = drawNextAlert(queue, 0)
    queue = first.queue
    const second = drawNextAlert(queue, 0)

    expect(new Set([first.alert.id, second.alert.id])).toEqual(
      new Set(['t1-a', 't1-b']),
    )
  })

  it('does not repeat the previous alert across a reshuffle', () => {
    let queue = createAlertQueue(alerts, 11)
    const ids: string[] = []

    for (let count = 0; count < 8; count += 1) {
      const draw = drawNextAlert(queue, 0)
      ids.push(draw.alert.id)
      queue = draw.queue
    }

    expect(ids.some((id, index) => index > 0 && id === ids[index - 1])).toBe(
      false,
    )
  })

  it('draws each tier from the real alert dataset', () => {
    let queue = createAlertQueue(ALERTS, 30)

    for (const [elapsedMs, expectedTier] of [
      [0, 1],
      [10_000, 2],
      [20_000, 3],
    ] as const) {
      const draw = drawNextAlert(queue, elapsedMs)
      expect(draw.alert.tier).toBe(expectedTier)
      queue = draw.queue
    }
  })

  it('fails clearly when the active tier has no alerts', () => {
    expect(() => createAlertQueue([], 1)).toThrow('No alerts configured for tier 1')
  })

  it('rejects a one-alert tier because repeats cannot be prevented', () => {
    const oneAlert = [alert('only-alert', 1)]

    expect(() => createAlertQueue(oneAlert, 1)).toThrow(
      'At least 2 alerts required for tier 1',
    )
  })
})
