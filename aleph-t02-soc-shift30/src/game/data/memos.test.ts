import { describe, expect, it } from 'vitest'

import { ALERTS } from './alerts'
import { MEMOS } from './memos'

describe('memo data', () => {
  it('links every memo to an alert that actually exists', () => {
    // 오타는 조용히 "메모가 안 뜬다"로 나타나 발견이 늦다.
    for (const memo of MEMOS) {
      expect(ALERTS.some((alert) => alert.id === memo.alertId)).toBe(true)
    }
  })

  it('keeps the allow and block halves balanced', () => {
    // 한쪽으로 기울면 "메모를 봤으면 통과"라는 새 정답표가 생긴다.
    // 심각도를 카드에서 제거한 것과 같은 이유다.
    const actions = MEMOS.map(
      (memo) => ALERTS.find((alert) => alert.id === memo.alertId)!.correctAction,
    )

    expect(actions.filter((action) => action === 'ALLOW')).toHaveLength(3)
    expect(actions.filter((action) => action === 'BLOCK')).toHaveLength(3)
  })

  it('covers tier 2 and tier 3 evenly so both slots can be filled', () => {
    // 슬롯은 티어 2용 2개, 티어 3용 2개다. 각 티어에 최소 2개가 있어야
    // 중복 없이 뽑을 수 있다.
    const tiers = MEMOS.map(
      (memo) => ALERTS.find((alert) => alert.id === memo.alertId)!.tier,
    )

    expect(tiers.filter((tier) => tier === 2).length).toBeGreaterThanOrEqual(2)
    expect(tiers.filter((tier) => tier === 3).length).toBeGreaterThanOrEqual(2)
    // 티어 1은 0~10초 구간이라 메모가 앞설 자리가 없다.
    expect(tiers).not.toContain(1)
  })

  it('uses unique ids and non-empty text', () => {
    expect(new Set(MEMOS.map((memo) => memo.id)).size).toBe(MEMOS.length)

    for (const memo of MEMOS) {
      expect(memo.from.length).toBeGreaterThan(0)
      expect(memo.body.length).toBeGreaterThan(0)
      expect(memo.time).toMatch(/^\d{2}:\d{2}$/)
      // 0.6초 안에 읽혀야 한다. 길면 읽지 못하고 닫는다.
      expect(memo.body.length).toBeLessThanOrEqual(45)
    }
  })
})
