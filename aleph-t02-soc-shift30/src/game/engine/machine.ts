import { DIFFICULTY, MEMO } from '../config'
import type {
  Action,
  Alert,
  DecisionRecord,
  GameState,
  Memo,
  Verdict,
} from '../types'
import { resolveAlert } from './rules'
import { calculateScoreGain } from './scoring'

/**
 * 판정 결과만으로 플레이어가 누른 조작을 복원한다.
 * CORRECT는 정답과 같은 조작, 오탐은 정상을 막은 BLOCK,
 * 미탐은 위협을 통과시킨 ALLOW, 미판정은 조작이 없어 null이다.
 */
function actionFromVerdict(alert: Alert, verdict: Verdict): Action | null {
  if (verdict === 'TIMEOUT') {
    return null
  }

  if (verdict === 'CORRECT') {
    return alert.correctAction
  }

  return verdict === 'FALSE_POSITIVE' ? 'BLOCK' : 'ALLOW'
}

function createRecord(alert: Alert, verdict: Verdict): DecisionRecord {
  return {
    alertId: alert.id,
    title: alert.title,
    category: alert.category,
    severity: alert.severity,
    action: actionFromVerdict(alert, verdict),
    verdict,
    decisiveFact: alert.decisiveFact,
    explanation: alert.explanation,
  }
}

export function createInitialGameState(): GameState {
  return {
    phase: 'READY',
    timeLeftMs: DIFFICULTY.totalTimeMs,
    lives: DIFFICULTY.lives,
    score: 0,
    combo: 0,
    maxCombo: 0,
    reviewed: 0,
    threatsBlocked: 0,
    normalAllowed: 0,
    falsePositives: 0,
    missedThreats: 0,
    timeouts: 0,
    currentAlert: null,
    lastVerdict: null,
    log: [],
    activeMemo: null,
    memosShown: 0,
    memosRead: 0,
  }
}

export function startGame(state: GameState): GameState {
  return state.phase === 'READY' ? { ...state, phase: 'PLAYING' } : state
}

export function pauseGame(state: GameState): GameState {
  return state.phase === 'PLAYING' ? { ...state, phase: 'PAUSED' } : state
}

export function resumeGame(state: GameState): GameState {
  return state.phase === 'PAUSED' ? { ...state, phase: 'PLAYING' } : state
}

export function restartGame(state: GameState): GameState {
  return state.phase === 'PAUSED' ||
    state.phase === 'SUCCESS' ||
    state.phase === 'FAILURE'
    ? createInitialGameState()
    : state
}

export function presentAlert(state: GameState, alert: Alert): GameState {
  if (state.phase !== 'PLAYING' || state.currentAlert !== null) {
    return state
  }

  return {
    ...state,
    currentAlert: alert,
    lastVerdict: null,
  }
}

/**
 * 메모를 띄운다. 규칙은 `docs/GAME_SPEC.md` 13절.
 *
 * 호출은 새 경보가 뜨는 순간에만 한다. 경보가 끝나갈 때 끼어들면 아무리
 * 빨리 닫아도 미판정이 되어 실력으로 피할 수 없다.
 */
export function showMemo(
  state: GameState,
  memo: Memo,
  elapsedMs: number,
): GameState {
  return state.phase !== 'PLAYING' || state.activeMemo !== null
    ? state
    : {
        ...state,
        activeMemo: { memo, shownAtMs: elapsedMs },
        memosShown: state.memosShown + 1,
      }
}

/** 화면에 `MEMO.readThresholdMs` 이상 떠 있다가 닫히면 읽은 것으로 센다. */
export function dismissMemo(state: GameState, elapsedMs: number): GameState {
  if (state.activeMemo === null) {
    return state
  }

  const visibleMs = elapsedMs - state.activeMemo.shownAtMs

  return {
    ...state,
    activeMemo: null,
    memosRead:
      visibleMs >= MEMO.readThresholdMs ? state.memosRead + 1 : state.memosRead,
  }
}

export function decideCurrentAlert(
  state: GameState,
  action: Action,
): GameState {
  // 메모가 떠 있는 동안에는 판정을 받지 않는다. 눈 감고 누르는 사고를 막는다.
  if (state.currentAlert === null || state.activeMemo !== null) {
    return state
  }

  return applyVerdict(
    state,
    resolveAlert(state.currentAlert, action),
    state.currentAlert,
  )
}

export function timeoutCurrentAlert(state: GameState): GameState {
  return state.currentAlert === null
    ? state
    : applyVerdict(state, 'TIMEOUT', state.currentAlert)
}

export function applyVerdict(
  state: GameState,
  verdict: Verdict,
  alert: Alert,
): GameState {
  if (state.phase !== 'PLAYING') {
    return state
  }

  if (verdict === 'TIMEOUT') {
    const lives = Math.max(0, state.lives - 1)

    return {
      ...state,
      phase: lives === 0 ? 'FAILURE' : state.phase,
      lives,
      combo: 0,
      timeouts: state.timeouts + 1,
      currentAlert: null,
      lastVerdict: verdict,
      log: [...state.log, createRecord(alert, verdict)],
    }
  }

  const isCorrect = verdict === 'CORRECT'
  const combo = isCorrect ? state.combo + 1 : 0
  const lives = isCorrect ? state.lives : Math.max(0, state.lives - 1)

  return {
    ...state,
    phase: lives === 0 ? 'FAILURE' : state.phase,
    lives,
    score: state.score + calculateScoreGain(alert, verdict, combo),
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    reviewed: state.reviewed + 1,
    threatsBlocked:
      state.threatsBlocked +
      (isCorrect && alert.correctAction === 'BLOCK' ? 1 : 0),
    normalAllowed:
      state.normalAllowed +
      (isCorrect && alert.correctAction === 'ALLOW' ? 1 : 0),
    falsePositives:
      state.falsePositives + (verdict === 'FALSE_POSITIVE' ? 1 : 0),
    missedThreats:
      state.missedThreats + (verdict === 'MISSED_THREAT' ? 1 : 0),
    currentAlert: null,
    lastVerdict: verdict,
    log: [...state.log, createRecord(alert, verdict)],
  }
}

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== 'PLAYING' || !Number.isFinite(deltaMs) || deltaMs <= 0) {
    return state
  }

  if (state.lives <= 0) {
    return { ...state, phase: 'FAILURE' }
  }

  const timeLeftMs = Math.max(0, state.timeLeftMs - deltaMs)

  return {
    ...state,
    phase: timeLeftMs === 0 ? 'SUCCESS' : state.phase,
    timeLeftMs,
  }
}
