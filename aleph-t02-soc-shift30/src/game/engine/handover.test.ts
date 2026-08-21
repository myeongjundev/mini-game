import { describe, expect, it } from 'vitest'

import { DIFFICULTY } from '../config'
import { ALERTS } from '../data/alerts'
import type { DecisionRecord, GameState, PhoneCall } from '../types'
import { buildHandover } from './handover'
import { createInitialGameState } from './machine'

function record(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    alertId: 'ssh-brute',
    title: 'SSH LOGIN FAILURE',
    category: 'login',
    severity: 'HIGH',
    action: 'BLOCK',
    verdict: 'CORRECT',
    decisiveFact: 'FAILED LOGIN',
    explanation: '',
    ...overrides,
  }
}

function finished(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(),
    phase: 'SUCCESS',
    timeLeftMs: 0,
    ...overrides,
  }
}

const call: PhoneCall = {
  alertId: 'contractor-proddb',
  order: 'ALLOW',
  truthful: false,
  caller: '관제 팀장',
  message: '',
}

function textOf(state: GameState): string {
  return buildHandover(state)
    .blocks.flatMap((block) => block.lines)
    .join('\n')
}

describe('buildHandover', () => {
  it('근무 시간대를 경과 시간으로 정한다', () => {
    expect(buildHandover(finished()).period).toBe('02:47 – 03:17')
  })

  it('중간에 끝난 근무는 끝 시각이 앞당겨진다', () => {
    const state = finished({ phase: 'FAILURE', timeLeftMs: 12_000 })

    expect(buildHandover(state).period).toBe('02:47 – 03:05')
  })

  it('전부 맞힌 밤에는 놓친 것이 없다고 적는다', () => {
    const state = finished({
      log: [record(), record()],
      reviewed: 2,
      threatsBlocked: 2,
    })

    expect(textOf(state)).toContain('경보 2건을 봤습니다.')
    expect(textOf(state)).toContain('놓친 건 없습니다.')
    expect(textOf(state)).toContain('특이사항 없습니다.')
  })

  it('미판정과 오판을 나눠 적는다', () => {
    const state = finished({
      log: [
        record(),
        record({ verdict: 'TIMEOUT', action: null }),
        record({ verdict: 'MISSED_THREAT', action: 'ALLOW' }),
      ],
      reviewed: 2,
      timeouts: 1,
      missedThreats: 1,
    })

    expect(textOf(state)).toContain('그중 1건은 손도 못 댔습니다')
    expect(textOf(state)).toContain('위험한 걸 1건 통과시켰습니다.')
  })

  it('실패한 밤에는 가장 심각한 건을 인계 항목으로 남긴다', () => {
    const state = finished({
      phase: 'FAILURE',
      log: [
        record({ verdict: 'FALSE_POSITIVE', severity: 'LOW' }),
        record({
          alertId: 'priv-esc',
          severity: 'CRITICAL',
          verdict: 'MISSED_THREAT',
        }),
      ],
    })

    expect(textOf(state)).toContain('더 버티지 못하고 교대했습니다.')
    expect(textOf(state)).toContain('인계받는 분께 — 권한 변경 건 확인 부탁드립니다.')
  })

  it('심각도가 같으면 손도 못 댄 것보다 잘못 판단한 것을 인계한다', () => {
    const state = finished({
      log: [
        record({ alertId: 'priv-esc', severity: 'CRITICAL', verdict: 'TIMEOUT', action: null }),
        record({
          alertId: 'contractor-proddb',
          severity: 'CRITICAL',
          verdict: 'MISSED_THREAT',
          action: 'ALLOW',
        }),
      ],
    })

    expect(textOf(state)).toContain('협력업체 접근 건 확인 부탁드립니다.')
  })

  it('거짓 지시를 따랐으면 무엇이 그것을 뒤집었는지 적는다', () => {
    const state = finished({
      phoneLog: call,
      phoneAnswered: 1,
      log: [
        record({
          alertId: 'contractor-proddb',
          severity: 'CRITICAL',
          action: 'ALLOW',
          verdict: 'MISSED_THREAT',
          order: 'ALLOW',
          orderFollowed: true,
        }),
      ],
    })

    const text = textOf(state)

    expect(text).toContain('협력업체 접근 건 “통과시켜” 지시')
    expect(text).toContain('지시대로 통과시켰습니다. 역할에 없는 자원 접근이었습니다.')
  })

  it('거짓 지시를 어겼으면 어긴 근거를 적는다', () => {
    const state = finished({
      phoneLog: call,
      phoneAnswered: 1,
      log: [
        record({
          alertId: 'contractor-proddb',
          severity: 'CRITICAL',
          action: 'BLOCK',
          verdict: 'CORRECT',
          order: 'ALLOW',
          orderFollowed: false,
        }),
      ],
    })

    expect(textOf(state)).toContain(
      '따르지 않았습니다. 역할에 없는 자원 접근이었습니다.',
    )
  })

  it('참인 지시를 어겼으면 제 판단이 틀렸다고 적는다', () => {
    const state = finished({
      phoneLog: { ...call, order: 'BLOCK', truthful: true },
      phoneAnswered: 1,
      log: [
        record({
          alertId: 'contractor-proddb',
          action: 'ALLOW',
          verdict: 'MISSED_THREAT',
          order: 'BLOCK',
          orderFollowed: false,
        }),
      ],
    })

    expect(textOf(state)).toContain('따르지 않았습니다. 제 판단이 틀렸습니다.')
  })

  it('못 받은 전화는 통화 내용 대신 놓쳤다고만 적는다', () => {
    const state = finished({ phoneLog: call, phoneMissed: 1 })
    const text = textOf(state)

    expect(text).toContain('전화가 왔는데 받지 못했습니다.')
    expect(text).not.toContain('지시')
  })

  // 나중으로 내린 채 근무가 끝나면 벨이 끝나지 않아 놓친 것으로도 세어지지
  // 않는다. 그래도 들은 적은 없으므로 지시를 적으면 안 된다.
  it('끝내 받지 않은 전화도 지시를 적지 않는다', () => {
    const state = finished({
      phase: 'FAILURE',
      phoneLog: call,
      phoneAnswered: 0,
      phoneMissed: 0,
      log: [
        record({
          alertId: 'contractor-proddb',
          severity: 'CRITICAL',
          action: 'ALLOW',
          verdict: 'MISSED_THREAT',
          order: 'ALLOW',
          orderFollowed: true,
        }),
      ],
    })
    const text = textOf(state)

    expect(text).toContain('끝내 받지 못했습니다.')
    expect(text).not.toContain('지시')
  })

  it('지목한 경보가 안 올라온 판을 구분해 적는다', () => {
    const state = finished({ phoneLog: call, phoneAnswered: 1, log: [record()] })

    expect(textOf(state)).toContain('그 건은 제 근무 중엔 올라오지 않았습니다.')
  })

  it('통화 시각은 전화가 걸려 오는 시각과 같다', () => {
    const state = finished({ phoneLog: call, phoneMissed: 1 })
    const phone = buildHandover(state).blocks.find((block) => block.time !== null)

    expect(phone?.time).toBe('03:08')
  })

  it('한 장도 못 본 판에도 문장이 나온다', () => {
    const state = finished({ phase: 'FAILURE', timeLeftMs: DIFFICULTY.totalTimeMs })

    expect(textOf(state)).toContain('올라온 경보가 없었습니다.')
  })

  it('경보 15종 전부 사람이 부르는 이름을 갖는다', () => {
    for (const alert of ALERTS) {
      const state = finished({
        log: [record({ alertId: alert.id, verdict: 'MISSED_THREAT' })],
      })

      expect(textOf(state)).not.toContain('해당 건')
    }
  })
})
