import { describe, expect, it } from 'vitest'

import { PHONE } from '../config'
import { ALERTS } from '../data/alerts'
import { MEMOS } from '../data/memos'
import { PHONE_MESSAGES } from '../data/phoneCalls'
import { createAlertQueue, drawNextAlert } from './alertQueue'
import {
  createPhonePlan,
  isPhoneDue,
  isRingExpired,
  resolvePhoneCall,
  ringProgress,
} from './phoneQueue'

const TIER_3 = ALERTS.filter((alert) => alert.tier === 3)

describe('전화 대사', () => {
  it('티어 3 경보마다 두 지시의 대사가 모두 있다', () => {
    // 지시는 정답 방향이 아니라 시드 난수로 정해진다. 한쪽 대사가 없으면
    // 그 조합이 뽑혔을 때 전화가 통째로 사라진다.
    for (const alert of TIER_3) {
      expect(PHONE_MESSAGES[alert.id]?.ALLOW).toBeTruthy()
      expect(PHONE_MESSAGES[alert.id]?.BLOCK).toBeTruthy()
    }
  })

  it('티어 3이 아닌 경보에는 대사를 두지 않는다', () => {
    const tier3Ids = TIER_3.map((alert) => alert.id)

    expect(Object.keys(PHONE_MESSAGES).sort()).toEqual([...tier3Ids].sort())
  })
})

describe('전화 배치', () => {
  it('시드가 같으면 지시도 같고 시드가 다르면 갈린다', () => {
    expect(createPhonePlan(7).order).toBe(createPhonePlan(7).order)

    const orders = new Set(
      Array.from({ length: 40 }, (_, i) => createPhonePlan(i * 977).order),
    )
    expect(orders).toEqual(new Set(['ALLOW', 'BLOCK']))
  })

  it('두 지시가 한쪽으로 쏠리지 않는다', () => {
    // 어느 쪽으로 기울면 "항상 따른다" 또는 "항상 무시한다"가 정답표가 된다.
    const orders = Array.from({ length: 400 }, (_, i) => createPhonePlan(i).order)
    const allow = orders.filter((order) => order === 'ALLOW').length

    expect(allow).toBeGreaterThan(140)
    expect(allow).toBeLessThan(260)
  })

  it('자격 시각 전에는 걸려 오지 않고 한 판에 한 번만 온다', () => {
    const plan = createPhonePlan(1)

    expect(isPhoneDue(plan, PHONE.slotMs - 1)).toBe(false)
    expect(isPhoneDue(plan, PHONE.slotMs)).toBe(true)
    expect(isPhoneDue({ ...plan, shown: PHONE.perShift }, PHONE.slotMs)).toBe(false)
  })
})

describe('지목할 경보 고르기', () => {
  // 실제 호출 순서를 그대로 흉내낸다. 리듀서는 경보를 먼저 뽑고 그 다음
  // 큐를 읽는다. 봉지는 그 티어를 처음 뽑을 때 채워지므로 이 순서여야
  // 티어 3 봉지가 차 있다.
  const queue = drawNextAlert(createAlertQueue(ALERTS, 12_345), 21_000).queue

  it('큐를 바꾸지 않는다', () => {
    // 13.4의 "큐를 따로 손대지 않는다"를 지킨다. 뽑지 않고 들여다본다.
    const before = JSON.stringify(queue.remainingByTier[3].map((a) => a.id))
    resolvePhoneCall(queue, 'ALLOW', [])

    expect(JSON.stringify(queue.remainingByTier[3].map((a) => a.id))).toBe(before)
  })

  it('지시가 정답과 같으면 참, 다르면 거짓이다', () => {
    const call = resolvePhoneCall(queue, 'ALLOW', [])
    const target = ALERTS.find((alert) => alert.id === call?.alertId)

    expect(call?.truthful).toBe(target?.correctAction === 'ALLOW')

    const opposite = resolvePhoneCall(queue, 'BLOCK', [])
    expect(opposite?.truthful).toBe(target?.correctAction === 'BLOCK')
  })

  it('이번 판에 공지가 뜬 경보는 지목하지 않는다', () => {
    // 한 경보에 출처가 둘이면 전화가 알려줄 것이 없어지고 받을 이유도
    // 사라진다. GAME_SPEC 14.4.
    const front = queue.remainingByTier[3][0]
    const call = resolvePhoneCall(queue, 'ALLOW', [front.id])

    expect(call?.alertId).not.toBe(front.id)
  })

  it('지목한 경보는 언제나 티어 3이다', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const call = resolvePhoneCall(createAlertQueue(ALERTS, seed), 'BLOCK', [])
      const target = ALERTS.find((alert) => alert.id === call?.alertId)

      expect(target?.tier).toBe(3)
    }
  })

  it('공지가 붙는 티어 3 경보를 전부 빼도 지목할 것이 남는다', () => {
    const memoAlertIds = MEMOS.map((memo) => memo.alertId)
    const call = resolvePhoneCall(queue, 'ALLOW', memoAlertIds)

    expect(call).not.toBeNull()
    expect(memoAlertIds).not.toContain(call?.alertId)
  })
})

describe('벨 시계', () => {
  it('ringMs가 지나면 끊긴다', () => {
    expect(isRingExpired(21_000, 21_000 + PHONE.ringMs - 1)).toBe(false)
    expect(isRingExpired(21_000, 21_000 + PHONE.ringMs)).toBe(true)
  })

  it('남은 비율은 1에서 0으로 줄고 범위를 벗어나지 않는다', () => {
    expect(ringProgress(21_000, 21_000)).toBe(1)
    expect(ringProgress(21_000, 21_000 + PHONE.ringMs / 2)).toBeCloseTo(0.5)
    expect(ringProgress(21_000, 21_000 + PHONE.ringMs * 2)).toBe(0)
  })

  it('벨이 근무 종료 전에 끝난다', () => {
    // 30초에 걸치면 손쓸 수 없는 라이프 손실이 된다. GAME_SPEC 14.5.
    expect(PHONE.slotMs + PHONE.ringMs).toBeLessThan(30_000)
  })
})
