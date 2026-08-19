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
  memosShown: number
  memosRead: number
}
