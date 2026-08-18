import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ALERTS } from '../game/data/alerts'
import { createInitialGameState } from '../game/engine/machine'
import type { DecisionRecord } from '../game/types'
import AlertCard from './AlertCard'
import ShiftLog from './ShiftLog'
import PausedScreen from './screens/PausedScreen'
import ResultScreen from './screens/ResultScreen'

describe('screen components', () => {
  it('renders alert facts and progress without exposing the correct action', () => {
    const alert = ALERTS[0]
    const markup = renderToStaticMarkup(
      <AlertCard alert={alert} timeRemainingRatio={0.5} />,
    )

    expect(markup).toContain(alert.title)
    expect(markup.match(/<dt>/g)).toHaveLength(4)
    expect(markup).toContain('scaleX(0.5)')
    expect(markup).not.toContain(alert.correctAction)
    expect(markup).not.toContain('class="suspicious-marker"')
    expect(markup).not.toContain('수상한 항목: ')
  })

  it('marks only suspicious facts with a shape and screen-reader text', () => {
    const alert = ALERTS.find((item) => item.id === 'ssh-brute')

    expect(alert).toBeDefined()
    const markup = renderToStaticMarkup(
      <AlertCard alert={alert!} timeRemainingRatio={1} />,
    )

    expect(markup).toContain('수상한 항목에 표시가 붙습니다')
    expect(markup.match(/class="suspicious-marker"/g)).toHaveLength(3)
    expect(markup.match(/수상한 항목: /g)).toHaveLength(3)
    expect(markup.match(/class="fact-suspicious"/g)).toHaveLength(3)
  })

  it('includes both resume and restart controls on the paused screen', () => {
    const markup = renderToStaticMarkup(
      <PausedScreen onResume={() => undefined} onRestart={() => undefined} />,
    )

    expect(markup).toContain('RESUME')
    expect(markup).toContain('RESTART')
  })

  it('renders the complete result report and distinct failure bars', () => {
    const state = {
      ...createInitialGameState(),
      phase: 'FAILURE' as const,
      timeLeftMs: 12_000,
      score: 500,
      reviewed: 5,
      threatsBlocked: 2,
      normalAllowed: 1,
      falsePositives: 1,
      missedThreats: 1,
      timeouts: 2,
      maxCombo: 3,
    }
    const markup = renderToStaticMarkup(
      <ResultScreen state={state} bestScore={800} onRestart={() => undefined} />,
    )

    for (const label of [
      'RESULT',
      'SCORE',
      'ALERTS REVIEWED',
      'THREATS BLOCKED',
      'NORMAL ALLOWED',
      'FALSE POSITIVES',
      'MISSED THREATS',
      'NO DECISIONS',
      'ACCURACY',
      'MAX COMBO',
      'BEST SCORE',
      'SURVIVAL TIME',
    ]) {
      expect(markup).toContain(label)
    }
    expect(markup).toContain('error-false-positive')
    expect(markup).toContain('error-missed-threat')
  })
})

describe('shift log', () => {
  const log: DecisionRecord[] = [
    {
      alertId: 'https-normal',
      title: 'OUTBOUND HTTPS',
      category: 'traffic',
      severity: 'LOW',
      action: 'ALLOW',
      verdict: 'CORRECT',
      explanation: '정상 암호화 트래픽이다.',
    },
    {
      alertId: 'backup-job',
      title: 'SCHEDULED NIGHT TRANSFER',
      category: 'traffic',
      severity: 'HIGH',
      action: 'BLOCK',
      verdict: 'FALSE_POSITIVE',
      explanation: '등록된 백업 서버로 가는 정기 작업이다.',
    },
    {
      alertId: 'exfil',
      title: 'LARGE OUTBOUND TRANSFER',
      category: 'traffic',
      severity: 'CRITICAL',
      action: null,
      verdict: 'TIMEOUT',
      explanation: '심야 대량 전송은 데이터 반출이다.',
    },
  ]

  it('lists every decision in play order with its explanation', () => {
    const markup = renderToStaticMarkup(<ShiftLog log={log} />)

    expect(markup.indexOf('OUTBOUND HTTPS')).toBeLessThan(
      markup.indexOf('SCHEDULED NIGHT TRANSFER'),
    )
    expect(markup.indexOf('SCHEDULED NIGHT TRANSFER')).toBeLessThan(
      markup.indexOf('LARGE OUTBOUND TRANSFER'),
    )
    for (const entry of log) {
      expect(markup).toContain(entry.explanation)
    }
  })

  it('marks only failed decisions and shows a dash for no decision', () => {
    const markup = renderToStaticMarkup(<ShiftLog log={log} />)

    expect(markup.match(/shift-log-item-failed/g)).toHaveLength(2)
    expect(markup).toContain('내 판단 ')
    expect(markup).toContain('—')
    expect(markup).toContain('3장 중 2장을 놓쳤습니다')
  })

  it('shows a single line instead of an empty list', () => {
    const markup = renderToStaticMarkup(<ShiftLog log={[]} />)

    expect(markup).toContain('판정한 경보가 없습니다.')
    expect(markup).not.toContain('shift-log-list')
  })
})
