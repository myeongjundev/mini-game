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
  explanation: string
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
}
