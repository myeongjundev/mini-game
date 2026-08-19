import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ALERTS } from '../game/data/alerts'
import { MEMOS } from '../game/data/memos'
import { createInitialGameState } from '../game/engine/machine'
import type { DecisionRecord } from '../game/types'
import AlertCard from './AlertCard'
import ShiftLog from './ShiftLog'
import PausedScreen from './screens/PausedScreen'
import MemoToast from './MemoToast'
import ReadyScreen, { GUIDE_PAGE_COUNT, LobbyGuidePage } from './screens/ReadyScreen'
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

  it('never shows severity on the card because it predicts the answer', () => {
    for (const alert of ALERTS) {
      const markup = renderToStaticMarkup(
        <AlertCard alert={alert} timeRemainingRatio={1} />,
      )

      expect(markup).not.toContain(alert.severity)
      expect(markup).not.toContain('severity-')
      expect(markup).toContain(`TIER ${alert.tier}`)
    }
  })

  it('renders the lobby menu and current shift record', () => {
    const markup = renderToStaticMarkup(
      <ReadyScreen
        bestScore={1200}
        mute
        reduceMotion={false}
        playIntro={false}
        onIntroComplete={() => undefined}
        onStart={() => undefined}
        onToggleMute={() => undefined}
        onToggleReduceMotion={() => undefined}
      />,
    )

    expect(markup).toContain('SOC SHIFT:30')
    expect(markup).toContain('START SHIFT')
    expect(markup).toContain('HOW TO PLAY')
    expect(markup).toContain('SHIFT RECORD')
    expect(markup).toContain('SOUND // OFF')
    expect(markup).toContain('A / ←')
    expect(markup).toContain('D / →')
    expect(markup).toContain('P / ESC')

    const allowPage = renderToStaticMarkup(<LobbyGuidePage page={1} />)
    expect(allowPage).toContain('DEVICE')
    expect(allowPage).not.toContain('class="suspicious-marker"')

    // 개수로 세지 말라는 원칙은 판단 기준 쪽에 모아둔다.
    expect(renderToStaticMarkup(<LobbyGuidePage page={4} />))
      .toContain('표시 개수가 아니라')

    const blockPage = renderToStaticMarkup(<LobbyGuidePage page={2} />)
    expect(blockPage).toContain('FAILED LOGIN')
    expect(blockPage.match(/class="suspicious-marker"/g)).toHaveLength(3)

    // 표시 개수 규칙은 15개 중 14개를 맞히는 사실상의 정답표라 가르치지 않는다.
    for (const page of [allowPage, blockPage]) {
      expect(page).not.toMatch(/표시가 \d+개/)
    }
  })

  it('explains why each example alert is allowed or blocked', () => {
    // 결정적 항목만 짚으면 "왜"가 빠진다. 경보 데이터의 설명을 그대로 쓴다.
    const allow = ALERTS.find((item) => item.id === 'https-normal')
    const block = ALERTS.find((item) => item.id === 'ssh-brute')

    expect(renderToStaticMarkup(<LobbyGuidePage page={1} />)).toContain(allow!.explanation)
    expect(renderToStaticMarkup(<LobbyGuidePage page={2} />)).toContain(block!.explanation)
  })

  it('renders every guide page without throwing', () => {
    for (let page = 0; page < GUIDE_PAGE_COUNT; page += 1) {
      expect(renderToStaticMarkup(<LobbyGuidePage page={page} />).length).toBeGreaterThan(0)
    }
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
      decisiveFact: 'DESTINATION',
      explanation: '정상 암호화 트래픽이다.',
    },
    {
      alertId: 'backup-job',
      title: 'SCHEDULED NIGHT TRANSFER',
      category: 'traffic',
      severity: 'HIGH',
      action: 'BLOCK',
      verdict: 'FALSE_POSITIVE',
      decisiveFact: 'DESTINATION',
      explanation: '등록된 백업 서버로 가는 정기 작업이다.',
    },
    {
      alertId: 'exfil',
      title: 'LARGE OUTBOUND TRANSFER',
      category: 'traffic',
      severity: 'CRITICAL',
      action: null,
      verdict: 'TIMEOUT',
      decisiveFact: 'DESTINATION',
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

  it('reveals severity and the decisive fact only after the shift ends', () => {
    const markup = renderToStaticMarkup(<ShiftLog log={log} />)

    expect(markup).toContain('심각도 ')
    expect(markup).toContain('CRITICAL')
    expect(markup.match(/결정적 항목 · DESTINATION/g)).toHaveLength(3)
  })

  it('shows a single line instead of an empty list', () => {
    const markup = renderToStaticMarkup(<ShiftLog log={[]} />)

    expect(markup).toContain('판정한 경보가 없습니다.')
    expect(markup).not.toContain('shift-log-list')
  })
})

describe('memo toast', () => {
  const memo = MEMOS[0]

  it('shows who sent it, when, and what it says', () => {
    const markup = renderToStaticMarkup(
      <MemoToast memo={memo} onDismiss={() => undefined} />,
    )

    expect(markup).toContain(memo.from)
    expect(markup).toContain(memo.time)
    expect(markup).toContain(memo.body)
    // 닫는 방법을 화면에 적어둔다. 모르면 판정이 막힌 채로 시간이 흐른다.
    expect(markup).toContain('SPACE')
  })

  it('announces itself so screen reader users are not stuck', () => {
    const markup = renderToStaticMarkup(
      <MemoToast memo={memo} onDismiss={() => undefined} />,
    )

    expect(markup).toContain('aria-live="assertive"')
    expect(markup).toContain('사내 공지')
  })
})
