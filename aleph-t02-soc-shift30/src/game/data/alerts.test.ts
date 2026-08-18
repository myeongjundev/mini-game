import { describe, expect, it } from 'vitest'

import { ALERTS } from './alerts'

describe('alert dataset', () => {
  it('contains 15 alerts with exactly four facts each', () => {
    expect(ALERTS).toHaveLength(15)
    expect(ALERTS.every((alert) => alert.facts.length === 4)).toBe(true)
  })

  it('contains five alerts in every tier', () => {
    expect(
      Object.fromEntries(
        [1, 2, 3].map((tier) => [
          tier,
          ALERTS.filter((alert) => alert.tier === tier).length,
        ]),
      ),
    ).toEqual({ 1: 5, 2: 5, 3: 5 })
  })

  it('contains seven ALLOW and eight BLOCK answers', () => {
    expect(ALERTS.filter((alert) => alert.correctAction === 'ALLOW')).toHaveLength(
      7,
    )
    expect(ALERTS.filter((alert) => alert.correctAction === 'BLOCK')).toHaveLength(
      8,
    )
  })

  it('matches every documented suspicious-to-normal ratio', () => {
    const expectedRatios: Record<string, [number, number]> = {
      'https-normal': [0, 4],
      'dns-normal': [0, 4],
      'ssh-brute': [3, 1],
      'port-scan': [4, 0],
      'file-share': [0, 4],
      'known-user-new-device': [1, 3],
      'typo-login': [1, 3],
      'traffic-spike': [1, 3],
      'dns-tunnel': [3, 1],
      'slow-scan': [2, 2],
      'admin-breach': [4, 0],
      'priv-esc': [3, 1],
      'contractor-proddb': [2, 2],
      exfil: [4, 0],
      'backup-job': [2, 2],
    }

    for (const alert of ALERTS) {
      const suspicious = alert.facts.filter(
        (fact) => fact.signal === 'suspicious',
      ).length
      const normal = alert.facts.filter(
        (fact) => fact.signal === 'normal',
      ).length

      expect([suspicious, normal], alert.id).toEqual(expectedRatios[alert.id])
    }
  })

  it('does not give all three 2:2 alerts the same answer', () => {
    const tiedAlerts = ALERTS.filter(
      (alert) =>
        alert.facts.filter((fact) => fact.signal === 'suspicious').length === 2,
    )

    expect(tiedAlerts.map((alert) => alert.id)).toEqual([
      'slow-scan',
      'contractor-proddb',
      'backup-job',
    ])
    expect(new Set(tiedAlerts.map((alert) => alert.correctAction))).toEqual(
      new Set(['ALLOW', 'BLOCK']),
    )
  })

  it('keeps the revised DNS tunnel context and explanations verbatim', () => {
    const dnsTunnel = ALERTS.find((alert) => alert.id === 'dns-tunnel')
    const slowScan = ALERTS.find((alert) => alert.id === 'slow-scan')
    const backupJob = ALERTS.find((alert) => alert.id === 'backup-job')

    expect(dnsTunnel?.facts[2]).toEqual({
      label: 'RESOLVER',
      value: 'Internal',
      signal: 'normal',
    })
    expect(dnsTunnel?.explanation).toBe(
      '내부 리졸버를 거쳐도 무작위 서브도메인과 과대 응답은 DNS를 데이터 통로로 쓰는 터널링이다.',
    )
    expect(slowScan?.explanation).toBe(
      '한 번에 하나씩 느리게 접근해도 단일 외부 IP가 47개 포트를 훑었다면 임계값을 피한 스캔이다.',
    )
    expect(backupJob?.explanation).toBe(
      '심야 대용량이라도 등록된 백업 서버로 가는 정기 작업이다. 이걸 막으면 백업이 죽는다.',
    )
  })
})
