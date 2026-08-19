import { describe, expect, it } from 'vitest'

import { MEMO } from '../config'
import { ALERTS } from '../data/alerts'
import { createMemoPlan, takeDueMemo } from './memoQueue'

const tierOf = (alertId: string) =>
  ALERTS.find((alert) => alert.id === alertId)!.tier

describe('memo plan', () => {
  it('fills every slot without repeating a memo', () => {
    const plan = createMemoPlan(12_345)

    expect(plan.slots).toHaveLength(MEMO.perShift)
    expect(new Set(plan.slots.map((slot) => slot.memo.id)).size).toBe(MEMO.perShift)
  })

  it('puts tier 2 memos before tier 2 starts and tier 3 memos before tier 3', () => {
    // 이것이 짝짓기의 전부다. 큐가 티어별 봉지라 나머지는 저절로 맞는다.
    for (const seed of [1, 7, 99, 4_242, 999_999]) {
      for (const slot of createMemoPlan(seed).slots) {
        const tier = tierOf(slot.memo.alertId)
        const tierStartsAtMs = ((tier - 1) * 30_000) / 3

        expect(slot.dueAtMs).toBeLessThan(tierStartsAtMs)
      }
    }
  })

  it('uses the documented slot times in order', () => {
    expect(createMemoPlan(5).slots.map((slot) => slot.dueAtMs)).toEqual([
      ...MEMO.slotsMs,
    ])
  })

  it('is deterministic for a seed and varies across seeds', () => {
    const ids = (seed: number) => createMemoPlan(seed).slots.map((slot) => slot.memo.id)

    expect(ids(2_024)).toEqual(ids(2_024))
    const combinations = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ids(seed).join()))
    expect(combinations.size).toBeGreaterThan(1)
  })

  it('releases a memo only after its slot time and only once', () => {
    const plan = createMemoPlan(31)

    expect(takeDueMemo(plan, MEMO.slotsMs[0] - 1)).toBeNull()

    const first = takeDueMemo(plan, MEMO.slotsMs[0])
    expect(first).not.toBeNull()
    expect(first!.plan.shown).toBe(1)

    // 같은 슬롯이 두 번 나오지 않는다.
    expect(takeDueMemo(first!.plan, MEMO.slotsMs[0])).toBeNull()
  })

  it('stops after the last slot', () => {
    let plan = createMemoPlan(77)

    for (let index = 0; index < MEMO.perShift; index += 1) {
      const taken = takeDueMemo(plan, 30_000)
      expect(taken).not.toBeNull()
      plan = taken!.plan
    }

    expect(takeDueMemo(plan, 30_000)).toBeNull()
  })
})
