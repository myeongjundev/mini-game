import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PHONE } from '../game/config'
import { ALERTS } from '../game/data/alerts'
import { MEMOS } from '../game/data/memos'
import { PHONE_CALLER } from '../game/data/phoneCalls'
import { formatSeconds } from '../utils/format'
import { PORTRAIT_BY_ALERT, PORTRAIT_BY_DEPARTMENT } from '../game/data/portraits'
import { createInitialGameState } from '../game/engine/machine'
import type { DecisionRecord } from '../game/types'
import ActionButtons from './ActionButtons'
import AlertCard from './AlertCard'
import Hud from './Hud'
import ShiftLog from './ShiftLog'
import PausedScreen from './screens/PausedScreen'
import MemoLog from './MemoLog'
import MemoToast from './MemoToast'
import PhoneOverlay from './PhoneOverlay'
import ReadyScreen, { GUIDE_PAGE_COUNT, GUIDE_TITLES, LobbyGuidePage } from './screens/ReadyScreen'
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

  it('사건 당사자가 있는 경보에만 얼굴이 붙는다', () => {
    for (const alert of ALERTS) {
      const markup = renderToStaticMarkup(
        <AlertCard alert={alert} timeRemainingRatio={1} />,
      )
      const file = PORTRAIT_BY_ALERT[alert.id]

      if (file === undefined) {
        // 모든 경보에 빈 자리를 만들지 않는다.
        expect(markup).not.toContain('alert-portrait')
        continue
      }

      expect(markup).toContain(`${import.meta.env.BASE_URL}${file}`)
      // 얼굴 때문에 사실 행이 줄면 판단 근거가 사라진다.
      expect(markup.match(/<dt>/g)).toHaveLength(alert.facts.length)
      for (const fact of alert.facts) {
        expect(markup).toContain(fact.value)
      }
    }
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
        volume={1}
        reduceMotion={false}
        playIntro={false}
        onIntroComplete={() => undefined}
        onStart={() => undefined}
        onToggleMute={() => undefined}
        onSetVolume={() => undefined}
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

    // 쪽 번호가 아니라 제목으로 찾는다. 쪽을 넣어도 검사가 썩지 않는다.
    const pageOf = (title: string) => GUIDE_TITLES.indexOf(title)
    const allowPage = renderToStaticMarkup(<LobbyGuidePage page={pageOf('통과시키는 경보')} />)
    expect(allowPage).toContain('DEVICE')
    expect(allowPage).not.toContain('class="suspicious-marker"')

    // 개수로 세지 말라는 원칙은 판단 기준 쪽에 모아둔다.
    expect(renderToStaticMarkup(<LobbyGuidePage page={pageOf('자주 갈리는 지점')} />))
      .toContain('표시 개수가 아니라')

    const blockPage = renderToStaticMarkup(<LobbyGuidePage page={pageOf('막는 경보')} />)
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

    const pageOf = (title: string) => GUIDE_TITLES.indexOf(title)
    expect(renderToStaticMarkup(<LobbyGuidePage page={pageOf('통과시키는 경보')} />)).toContain(allow!.explanation)
    expect(renderToStaticMarkup(<LobbyGuidePage page={pageOf('막는 경보')} />)).toContain(block!.explanation)
  })

  /**
   * 가이드가 규칙에서 떨어져 나가지 않게 붙든다.
   *
   * 상사의 전화는 08-21에 들어왔는데 가이드에는 한동안 없었다. 라이프를
   * 깎고 지시가 거짓일 수 있는 장치를 안내 없이 만나면 처음 하는 사람은
   * 그냥 당한다. 시간 값은 설정에서 파생시켜, 벨 길이를 바꾸면 이 검사가
   * 같이 움직이게 한다.
   */
  it('teaches the phone rules that can cost a life', () => {
    const pageOf = (title: string) => GUIDE_TITLES.indexOf(title)
    const markup = renderToStaticMarkup(<LobbyGuidePage page={pageOf('상사의 전화')} />)

    expect(markup).toContain(PHONE_CALLER)
    expect(markup).toContain(formatSeconds(PHONE.ringMs))
    expect(markup).toContain('라이프가 줄어듭니다')
    // 카드와 공지는 협조적이지만 상사는 아니다. 그것만은 반드시 알린다.
    expect(markup).toContain('지시가 언제나 옳지는 않습니다')
    // 미루는 것이 없애는 것으로 읽히면 벨을 놓친다.
    expect(markup).toContain('벨은 계속 갑니다')
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
      <ResultScreen state={state} bestScore={800} onRestart={() => undefined} onRetry={() => undefined} />,
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

  it('방금 꺼진 하트에만 표시를 붙인다', () => {
    const state = { ...createInitialGameState(), phase: 'PLAYING' as const, lives: 2 }
    const markup = renderToStaticMarkup(<Hud state={state} lifeLost />)
    const hearts = markup.match(/class="heart-icon[^"]*"/g) ?? []

    expect(hearts).toHaveLength(3)
    expect(hearts.filter((cls) => cls.includes('heart-just-lost'))).toHaveLength(1)
    // 남은 개수 바로 다음 자리가 방금 꺼진 하트다.
    expect(hearts[2]).toContain('heart-just-lost')
    expect(hearts[2]).toContain('heart-empty')
  })

  it('라이프를 잃지 않았으면 하트 표시가 없다', () => {
    const state = { ...createInitialGameState(), phase: 'PLAYING' as const, lives: 2 }
    const markup = renderToStaticMarkup(<Hud state={state} />)

    expect(markup).not.toContain('heart-just-lost')
  })

  it('마지막 하나가 남으면 하트 줄이 경고 상태가 된다', () => {
    const one = { ...createInitialGameState(), phase: 'PLAYING' as const, lives: 1 }
    const two = { ...createInitialGameState(), phase: 'PLAYING' as const, lives: 2 }

    expect(renderToStaticMarkup(<Hud state={one} />)).toContain('heart-row-critical')
    expect(renderToStaticMarkup(<Hud state={two} />)).not.toContain('heart-row-critical')
  })

  it('puts the handover document above the score table', () => {
    const state = {
      ...createInitialGameState(),
      phase: 'SUCCESS' as const,
      timeLeftMs: 0,
      reviewed: 2,
      threatsBlocked: 2,
    }
    const markup = renderToStaticMarkup(
      <ResultScreen state={state} bestScore={800} onRestart={() => undefined} onRetry={() => undefined} />,
    )

    expect(markup).toContain('INCIDENT HANDOVER')
    expect(markup).toContain('02:47 – 03:17')
    expect(markup.indexOf('INCIDENT HANDOVER')).toBeLessThan(
      markup.indexOf('ALERTS REVIEWED'),
    )
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

  it('보낸 사람의 얼굴을 부서에 맞게 보여준다', () => {
    for (const item of MEMOS) {
      const markup = renderToStaticMarkup(
        <MemoToast memo={item} onDismiss={() => undefined} />,
      )
      const file = PORTRAIT_BY_DEPARTMENT[item.from]

      expect(markup).toContain(`${import.meta.env.BASE_URL}${file}`)
      // 얼굴이 부서 이름을 대신하면 안 된다. 읽어주는 것은 글자 쪽이다.
      expect(markup).toContain(item.from)
      expect(markup).toContain('alt=""')
    }
  })

  it('얼굴이 없는 부서에서는 공지 아이콘으로 돌아간다', () => {
    // 메모가 늘어나 표에 없는 부서가 오면 자리가 비지 않아야 한다.
    const markup = renderToStaticMarkup(
      <MemoToast memo={{ ...memo, from: '없는팀' }} onDismiss={() => undefined} />,
    )

    expect(markup).toContain('memo-icon')
    expect(markup).toContain('없는팀')
  })
})

describe('phone overlay preview', () => {
  it('renders an incoming call without exposing a team instruction', () => {
    const markup = renderToStaticMarkup(
      <PhoneOverlay
        mode="ringing"
        caller="야간 팀장"
        message="보안 우선 회선에서 호출 중입니다."
        ringProgress={0.5}
        onAnswer={() => undefined}
        onLater={() => undefined}
      />,
    )

    expect(markup).toContain('phone-call.webp')
    expect(markup).toContain('SECURE LINE // INCOMING')
    expect(markup).toContain('↑')
    expect(markup).toContain('받기')
    expect(markup).toContain('↓')
    expect(markup).toContain('나중에')
    expect(markup).toContain('aria-valuenow="50"')
    expect(markup).not.toContain('team-lead-portrait-128.png')
  })

  it('puts the caller portrait and instruction in HTML after connecting', () => {
    const instruction = '다음 운영 DB 접근은 통과시켜.'
    const markup = renderToStaticMarkup(
      <PhoneOverlay
        mode="connected"
        caller="야간 팀장"
        message={instruction}
        onHangUp={() => undefined}
      />,
    )

    expect(markup).toContain('team-lead-portrait-128.png')
    expect(markup).toContain('phone-connected.webp')
    expect(markup).toContain('SECURE LINE // CONNECTED')
    expect(markup).toContain(instruction)
    expect(markup).toContain('통화 종료')
    expect(markup).toContain('카드의 증거와 대조')
    expect(markup).not.toContain('role="progressbar"')
  })

  it('clamps the incoming-call timer to an accessible percentage', () => {
    const markup = renderToStaticMarkup(
      <PhoneOverlay
        mode="ringing"
        caller="야간 팀장"
        message="호출 중"
        ringProgress={2}
        onAnswer={() => undefined}
        onLater={() => undefined}
      />,
    )

    expect(markup).toContain('aria-valuenow="100"')
    expect(markup).toContain('scaleX(1)')
  })
})

describe('action buttons while a memo is up', () => {
  // GAME_SPEC 13.2-1. 버튼을 지우면 "눌렀는데 왜 안 되지"가 아니라
  // "버튼이 어디 갔지"가 된다. 비활성 버튼은 막혔다는 사실을 화면에 남긴다.
  it('keeps both buttons in place and only disables them', () => {
    const markup = renderToStaticMarkup(
      <ActionButtons disabled onDecide={() => undefined} />,
    )

    expect(markup).toContain('ALLOW')
    expect(markup).toContain('BLOCK')
    expect(markup.match(/<button/g)).toHaveLength(2)
    expect(markup.match(/disabled=""/g)).toHaveLength(2)
  })

  it('leaves them pressable when no memo is up', () => {
    const markup = renderToStaticMarkup(
      <ActionButtons disabled={false} onDecide={() => undefined} />,
    )

    expect(markup.match(/<button/g)).toHaveLength(2)
    expect(markup).not.toContain('disabled')
  })
})

describe('shift log carries the memo that helped that alert', () => {
  // 오른쪽 목록만 두면 어느 공지가 어느 경보용이었는지 사람이 맞춰봐야
  // 한다. 틀린 경보 밑에 붙어야 "그 정보를 갖고 있었다"가 드러난다.
  const backupMemo = MEMOS.find((memo) => memo.alertId === 'backup-job')!
  const entry: DecisionRecord = {
    alertId: 'backup-job',
    title: 'SCHEDULED NIGHT TRANSFER',
    category: 'traffic',
    severity: 'HIGH',
    action: 'BLOCK',
    verdict: 'FALSE_POSITIVE',
    decisiveFact: 'DESTINATION',
    explanation: '등록된 백업 서버로 가는 정기 작업이다.',
  }

  it('attaches the memo to the alert it was about', () => {
    const markup = renderToStaticMarkup(
      <ShiftLog log={[entry]} memos={[backupMemo]} />,
    )

    expect(markup).toContain('받았던 공지')
    expect(markup).toContain(backupMemo.from)
    expect(markup).toContain(backupMemo.body)
  })

  it('leaves an alert alone when no memo pointed at it', () => {
    const other = MEMOS.find((memo) => memo.alertId !== 'backup-job')!
    const markup = renderToStaticMarkup(
      <ShiftLog log={[entry]} memos={[other]} />,
    )

    expect(markup).not.toContain('받았던 공지')
  })

  it('still renders without any memo prop', () => {
    expect(renderToStaticMarkup(<ShiftLog log={[entry]} />)).toContain(
      'SCHEDULED NIGHT TRANSFER',
    )
  })
})

describe('memo log marks memos whose alert never came', () => {
  // 슬롯 3·4는 티어 3 경보를 돕는데 티어 3은 20초부터다. 19초에 끝나면
  // 그 공지들은 가리킬 경보가 없었다. 실제로 그런 판이 나왔다.
  const memo = MEMOS[0]

  it('says so on the result screen', () => {
    const markup = renderToStaticMarkup(
      <MemoLog memos={[memo]} seenAlertIds={[]} />,
    )

    expect(markup).toContain('나오기 전에 근무가 끝났습니다')
  })

  it('stays quiet when the alert did come', () => {
    const markup = renderToStaticMarkup(
      <MemoLog memos={[memo]} seenAlertIds={[memo.alertId]} />,
    )

    expect(markup).not.toContain('나오기 전에 근무가 끝났습니다')
  })

  it('stays quiet during the shift, when the alert may still arrive', () => {
    const markup = renderToStaticMarkup(<MemoLog memos={[memo]} />)

    expect(markup).not.toContain('나오기 전에 근무가 끝났습니다')
  })
})

describe('판정 기록의 상사 지시', () => {
  const entry: DecisionRecord = {
    alertId: 'contractor-proddb',
    title: 'UNAUTHORIZED RESOURCE ACCESS',
    category: 'critical',
    severity: 'CRITICAL',
    action: 'ALLOW',
    verdict: 'MISSED_THREAT',
    decisiveFact: 'RESOURCE',
    explanation: '역할에 없는 운영 DB를 열었다.',
  }
  const call = {
    alertId: 'contractor-proddb',
    order: 'ALLOW' as const,
    truthful: false,
    caller: '관제 팀장',
    message: '통과시켜.',
  }

  it('지시를 따랐으면 따랐다고 적는다', () => {
    const markup = renderToStaticMarkup(
      <ShiftLog log={[{ ...entry, order: 'ALLOW', orderFollowed: true }]} />,
    )

    expect(markup).toContain('통과시켜')
    expect(markup).toContain('ORDER FOLLOWED')
  })

  it('지시를 어겼으면 어겼다고 적는다', () => {
    const markup = renderToStaticMarkup(
      <ShiftLog log={[{ ...entry, order: 'BLOCK', orderFollowed: false }]} />,
    )

    expect(markup).toContain('막아')
    expect(markup).toContain('ORDER REFUSED')
  })

  it('지시가 없던 경보에는 아무것도 붙이지 않는다', () => {
    const markup = renderToStaticMarkup(<ShiftLog log={[entry]} />)

    expect(markup).not.toContain('ORDER')
  })

  it('지목한 경보가 안 나온 판에는 그렇게 적는다', () => {
    // 티어 3 구간이 10초인데 3000ms면 3.3장만 뽑힌다. GAME_SPEC 14.8.
    const markup = renderToStaticMarkup(<ShiftLog log={[]} call={call} />)

    expect(markup).toContain('나오기 전에 근무가 끝났습니다')
  })

  it('지목한 경보가 나온 판에는 적지 않는다', () => {
    const markup = renderToStaticMarkup(<ShiftLog log={[entry]} call={call} />)

    expect(markup).not.toContain('나오기 전에 근무가 끝났습니다')
  })
})

describe('memo log', () => {
  it('shows every memo that arrived so it can be read again', () => {
    const markup = renderToStaticMarkup(<MemoLog memos={[MEMOS[0], MEMOS[1]]} />)

    expect(markup).toContain(MEMOS[0].from)
    expect(markup).toContain(MEMOS[0].body)
    expect(markup).toContain(MEMOS[1].body)
  })

  it('keeps its place before the first memo arrives', () => {
    // 3초에 갑자기 나타나면 그때 화면이 밀리고, 여기 쌓인다는 것도 모른다.
    const markup = renderToStaticMarkup(<MemoLog memos={[]} />)

    expect(markup).toContain('받은 공지가 없습니다')
    expect(markup).not.toContain('memo-log-list')
  })
})

describe('result screen memo tally', () => {
  const base = {
    ...createInitialGameState(),
    phase: 'SUCCESS' as const,
    timeLeftMs: 0,
    reviewed: 4,
  }

  it('reports how many memos were read out of those shown', () => {
    const markup = renderToStaticMarkup(
      <ResultScreen
        state={{ ...base, memosShown: 4, memosRead: 2 }}
        bestScore={0}
        onRestart={() => undefined}
        onRetry={() => undefined}
      />,
    )

    expect(markup).toContain('MEMOS READ')
    expect(markup).toContain('2 / 4')
  })

  it('hides the row when no memo appeared', () => {
    // "0 / 0"은 읽는 사람을 헷갈리게 한다.
    const markup = renderToStaticMarkup(
      <ResultScreen
        state={{ ...base, memosShown: 0, memosRead: 0 }}
        bestScore={0}
        onRestart={() => undefined}
        onRetry={() => undefined}
      />,
    )

    expect(markup).not.toContain('MEMOS READ')
  })

  it('does not fold memos into score or accuracy', () => {
    // 점수·등급에는 반영하지 않는다. GAME_SPEC 13.6절.
    const withMemos = renderToStaticMarkup(
      <ResultScreen
        state={{ ...base, score: 900, threatsBlocked: 4, memosShown: 4, memosRead: 4 }}
        bestScore={0}
        onRestart={() => undefined}
        onRetry={() => undefined}
      />,
    )
    const withoutMemos = renderToStaticMarkup(
      <ResultScreen
        state={{ ...base, score: 900, threatsBlocked: 4, memosShown: 4, memosRead: 0 }}
        bestScore={0}
        onRestart={() => undefined}
        onRetry={() => undefined}
      />,
    )

    for (const markup of [withMemos, withoutMemos]) {
      expect(markup).toContain('100.0%')
      expect(markup).toContain('900')
    }
  })
})
