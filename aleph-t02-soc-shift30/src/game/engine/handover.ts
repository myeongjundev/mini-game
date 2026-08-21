import { DIFFICULTY, PHONE } from '../config'
import { PHONE_CALLER } from '../data/phoneCalls'
import type { Alert, DecisionRecord, GameState } from '../types'

/**
 * 결과 화면에 얹는 인수인계서. 규칙은 `docs/GAME_SPEC.md` 15절.
 *
 * **표시 레이어다.** 점수도 라이프도 경보 큐도 건드리지 않고, 이미 쌓인
 * `log`·`phoneLog`·`timeouts`만 읽어 문장으로 바꾼다. 난이도 실험의 통제
 * 대상이 아니므로 20판 중간에 이 파일을 고쳐도 기록이 무효가 되지 않는다.
 */

/** 근무 시작 시각(분). 02:47은 가장 이른 공지 시각이다. */
const SHIFT_START_MINUTES = 2 * 60 + 47

/** 근무 1초를 1분으로 읽는다. 30초 근무가 30분 당직이 된다. */
const MINUTES_PER_SECOND = 1

const ORDER_VERB = { ALLOW: '통과시켰습니다', BLOCK: '막았습니다' } as const
const ORDER_LABEL = { ALLOW: '통과시켜', BLOCK: '막아' } as const

const SEVERITY_WEIGHT: Record<Alert['severity'], number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

/**
 * 심각도가 같을 때 무엇을 인계 항목으로 올릴지.
 *
 * 미판정은 위 문단에서 이미 건수로 셌다. 같은 CRITICAL이라면 **잘못 판단한
 * 것**이 손도 못 댄 것보다 먼저다. 통과시킨 위협이 제일 위인 이유는 그것만
 * 아침까지 살아 있기 때문이다.
 */
const VERDICT_WEIGHT: Record<DecisionRecord['verdict'], number> = {
  MISSED_THREAT: 3,
  FALSE_POSITIVE: 2,
  TIMEOUT: 1,
  CORRECT: 0,
}

/**
 * 경보를 사람이 부르는 이름. 카드 제목은 영문 대문자라 문장에 못 넣는다.
 *
 * 티어 3 다섯 개는 상사의 대사(`PHONE_MESSAGES`)와 같은 말로 부른다.
 * 통화 문단과 판정 문단이 같은 건을 다르게 부르면 읽는 사람이 헷갈린다.
 */
const ALERT_LABELS: Readonly<Record<string, string>> = {
  'https-normal': '외부 HTTPS 트래픽 건',
  'dns-normal': '내부 DNS 질의 건',
  'ssh-brute': 'SSH 로그인 실패 건',
  'port-scan': '포트 훑기 건',
  'file-share': '파일 서버 접근 건',
  'known-user-new-device': '신규 기기 로그인 건',
  'typo-login': '로그인 반복 실패 건',
  'traffic-spike': '트래픽 급증 건',
  'dns-tunnel': 'DNS 이상 질의 건',
  'slow-scan': '느린 포트 탐지 건',
  'admin-breach': '관리자 계정 건',
  'priv-esc': '권한 변경 건',
  'contractor-proddb': '협력업체 접근 건',
  exfil: '대용량 전송 건',
  'backup-job': '심야 전송 건',
}

/**
 * 상사의 지시가 거짓이었을 때 그것을 뒤집는 사실 한 줄.
 *
 * 각 경보의 `decisiveFact`를 사람 말로 옮긴 것이다. 지시를 따랐다면 이 줄이
 * 왜 틀렸는지가 되고, 어겼다면 왜 어겼는지가 된다.
 */
const DECISIVE_PHRASES: Readonly<Record<string, string>> = {
  'admin-breach': '실패한 로그인이 132회였습니다',
  'priv-esc': '승인 기록이 없는 권한 변경이었습니다',
  'contractor-proddb': '역할에 없는 자원 접근이었습니다',
  exfil: '나가는 주소가 미상 호스트였습니다',
  'backup-job': '등록된 백업 서버로 가는 정기 작업이었습니다',
}

export type HandoverBlock = {
  /** 근무 시각. 통화처럼 시각이 있는 문단만 갖는다. */
  time: string | null
  lines: string[]
}

export type HandoverReport = {
  /** 근무 시간대 한 줄. 예 `02:47 – 03:17` */
  period: string
  blocks: HandoverBlock[]
}

function formatClock(minutesFromMidnight: number): string {
  const total = Math.round(minutesFromMidnight)
  const hours = Math.floor(total / 60) % 24
  const minutes = total % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function clockAtElapsed(elapsedMs: number): string {
  const elapsedSeconds = Math.max(0, elapsedMs) / 1_000

  return formatClock(SHIFT_START_MINUTES + elapsedSeconds * MINUTES_PER_SECOND)
}

function labelOf(alertId: string): string {
  return ALERT_LABELS[alertId] ?? '해당 건'
}

function reviewLines(state: GameState): string[] {
  if (state.log.length === 0) {
    return ['올라온 경보가 없었습니다.']
  }

  const seen =
    state.timeouts > 0
      ? `경보 ${state.log.length}건이 올라왔고, 그중 ${state.timeouts}건은 손도 못 댔습니다.`
      : `경보 ${state.log.length}건을 봤습니다.`

  if (state.missedThreats > 0 && state.falsePositives > 0) {
    return [
      seen,
      `위험한 걸 ${state.missedThreats}건 통과시켰고, 멀쩡한 걸 ${state.falsePositives}건 막았습니다.`,
    ]
  }

  if (state.missedThreats > 0) {
    return [seen, `위험한 걸 ${state.missedThreats}건 통과시켰습니다.`]
  }

  if (state.falsePositives > 0) {
    return [
      seen,
      `멀쩡한 걸 ${state.falsePositives}건 막았습니다. 아침에 문의가 올 수 있습니다.`,
    ]
  }

  if (state.timeouts > 0) {
    return [seen, '판단한 것은 전부 맞았습니다.']
  }

  return [seen, '놓친 건 없습니다.']
}

function phoneBlock(state: GameState): HandoverBlock | null {
  const call = state.phoneLog

  if (call === null) {
    return null
  }

  const time = clockAtElapsed(PHONE.slotMs)
  const label = labelOf(call.alertId)

  // 받지 않았으면 무슨 말이었는지 모른다(15.3). `phoneMissed`만 보면 안 된다 —
  // 나중으로 내린 채 근무가 끝나면(라이프 소진 등) 벨이 끝나지 않아 놓친
  // 것으로도 세어지지 않는다. 그때도 들은 적은 없다.
  if (state.phoneAnswered === 0) {
    return {
      time,
      lines: [
        state.phoneMissed > 0
          ? `${PHONE_CALLER}에게 전화가 왔는데 받지 못했습니다.`
          : `${PHONE_CALLER}에게 전화가 왔는데 끝내 받지 못했습니다.`,
      ],
    }
  }

  const heading = `${PHONE_CALLER} 통화 — ${label} “${ORDER_LABEL[call.order]}” 지시.`
  const decided: DecisionRecord | undefined = state.log.find(
    (entry) => entry.alertId === call.alertId,
  )

  // 티어 3 구간에 3.3장만 뽑히므로 지목한 건이 끝내 안 올라오는 판이 있다.
  if (decided === undefined) {
    return { time, lines: [heading, '그 건은 제 근무 중엔 올라오지 않았습니다.'] }
  }

  if (decided.action === null) {
    return { time, lines: [heading, '그 건은 시간 안에 처리하지 못했습니다.'] }
  }

  const truthful = call.truthful
  const followed = decided.orderFollowed === true
  const reason = DECISIVE_PHRASES[call.alertId]

  if (followed && truthful) {
    return {
      time,
      lines: [heading, `지시대로 ${ORDER_VERB[call.order]}. 제 판단도 같았습니다.`],
    }
  }

  if (followed && !truthful) {
    return {
      time,
      lines: [heading, `지시대로 ${ORDER_VERB[call.order]}. ${reason}.`],
    }
  }

  if (!followed && !truthful) {
    return {
      time,
      lines: [heading, `따르지 않았습니다. ${reason}.`],
    }
  }

  return {
    time,
    lines: [heading, '따르지 않았습니다. 제 판단이 틀렸습니다.'],
  }
}

function closingLines(state: GameState): string[] {
  const lines: string[] = []

  if (state.phase === 'FAILURE') {
    lines.push('더 버티지 못하고 교대했습니다.')
  }

  const worst = state.log
    .filter((entry) => entry.verdict !== 'CORRECT')
    .sort(
      (a, b) =>
        SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] ||
        VERDICT_WEIGHT[b.verdict] - VERDICT_WEIGHT[a.verdict],
    )[0]

  if (worst === undefined) {
    lines.push('특이사항 없습니다.')

    return lines
  }

  lines.push(`인계받는 분께 — ${labelOf(worst.alertId)} 확인 부탁드립니다.`)

  return lines
}

export function buildHandover(state: GameState): HandoverReport {
  const elapsedMs = DIFFICULTY.totalTimeMs - state.timeLeftMs
  const period = `${formatClock(SHIFT_START_MINUTES)} – ${clockAtElapsed(elapsedMs)}`
  const phone = phoneBlock(state)

  return {
    period,
    blocks: [
      { time: null, lines: reviewLines(state) },
      ...(phone === null ? [] : [phone]),
      { time: null, lines: closingLines(state) },
    ],
  }
}
