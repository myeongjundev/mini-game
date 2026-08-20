export type Category = 'traffic' | 'login' | 'scan' | 'dns' | 'critical'
export type Action = 'ALLOW' | 'BLOCK'
export type Tier = 1 | 2 | 3
export type Signal = 'normal' | 'suspicious'

export type Alert = {
  id: string
  tier: Tier
  category: Category
  title: string
  facts: { label: string; value: string; signal: Signal }[]
  correctAction: Action
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  /** 판단을 가른 사실의 label. facts 중 하나와 반드시 일치한다. */
  decisiveFact: string
  explanation: string
}

export type Verdict =
  | 'CORRECT'
  | 'FALSE_POSITIVE'
  | 'MISSED_THREAT'
  | 'TIMEOUT'

export type DecisionRecord = {
  alertId: string
  title: string
  category: Category
  severity: Alert['severity']
  action: Action | null
  verdict: Verdict
  decisiveFact: string
  explanation: string
  /** 상사가 이 경보에 내린 지시. 전화가 지목했을 때만 있다. GAME_SPEC 14.8. */
  order?: Action
  /** 그 지시를 따랐는가. 미판정이면 따르지도 어기지도 않은 것이라 false다. */
  orderFollowed?: boolean
}

/** 근무 중 올라오는 사내 공지. 규칙은 `docs/GAME_SPEC.md` 13절. */
export type Memo = {
  id: string
  from: string
  time: string
  body: string
  /** 이 메모가 근거를 주는 경보의 id. `ALERTS`에 반드시 존재해야 한다. */
  alertId: string
}

/**
 * 상사의 전화 한 통. 규칙은 `docs/GAME_SPEC.md` 14절.
 *
 * 이 게임에서 **플레이어를 틀리게 만들 수 있는 유일한 요소**다. 카드와 메모는
 * 언제나 협조적이지만 상사는 거짓을 말할 수 있다.
 */
export type PhoneCall = {
  /** 지목한 티어 3 경보의 id. `ALERTS`에 반드시 존재한다. */
  alertId: string
  /** 상사의 지시. 통과시켜(ALLOW) 또는 막아(BLOCK). */
  order: Action
  /** 지시가 참인가. 지목한 경보의 `correctAction`과 같으면 참이다. */
  truthful: boolean
  caller: string
  message: string
}

/** 수신 팝업 / 나중에로 내림 / 통화 중. 규칙은 GAME_SPEC 14.3, 14.6. */
export type PhoneStatus = 'RINGING' | 'DEFERRED' | 'CONNECTED'

export type ActivePhone = {
  call: PhoneCall
  status: PhoneStatus
  /**
   * 벨이 울리기 시작한 경과 시간.
   *
   * 남은 시간을 경과 시간에서 빼서 구한다. 경과는 근무 중에만 늘어나므로
   * 일시정지에서 벨이 멈추는 것이 공짜로 따라온다(14.5).
   */
  ringStartedAtMs: number
}

export type ActiveMemo = {
  memo: Memo
  /** 표시를 시작한 시점의 경과 시간. 읽음 판정에 쓴다. */
  shownAtMs: number
}

export type GameState = {
  phase: 'READY' | 'PLAYING' | 'PAUSED' | 'SUCCESS' | 'FAILURE'
  timeLeftMs: number
  lives: number
  score: number
  combo: number
  maxCombo: number
  reviewed: number
  threatsBlocked: number
  normalAllowed: number
  falsePositives: number
  missedThreats: number
  timeouts: number
  currentAlert: Alert | null
  lastVerdict: Verdict | null
  log: DecisionRecord[]
  activeMemo: ActiveMemo | null
  /** 근무 중 받은 공지 전부. 닫아도 남아서 다시 읽을 수 있다. GAME_SPEC 13.6-1. */
  memoLog: Memo[]
  /** 화면에 떠 있거나 나중으로 내려둔 전화. 끝나면 null이다. */
  phone: ActivePhone | null
  /** 이번 판에 걸려 온 전화. 끊긴 뒤에도 결과 화면이 쓴다. */
  phoneLog: PhoneCall | null
  phoneAnswered: number
  phoneMissed: number
  memosShown: number
  memosRead: number
}
