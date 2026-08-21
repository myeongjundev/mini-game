import { DIFFICULTY, MEMO } from '../config'
import type {
  Action,
  Alert,
  DecisionRecord,
  GameState,
  Memo,
  PhoneCall,
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

/**
 * 판정할 때 플레이어가 상사의 지시를 **알고 있었는가**.
 *
 * 받지 않은 전화의 지시는 붙이지 않는다. 안 들은 말을 "따랐다"고 적으면
 * 우연히 같은 선택을 한 것이 복종으로 기록된다. 14.8의 장치는 상사의 말과
 * 카드가 부딪히는 순간을 보여주는 것인데, 못 들었으면 부딪힌 적이 없다.
 *
 * 인수인계서(15.3)도 같은 규칙을 쓴다. 한 화면에서 두 곳이 다른 말을 하면
 * 안 된다.
 */
function heardCall(state: GameState): PhoneCall | null {
  return state.phoneAnswered > 0 ? state.phoneLog : null
}

function createRecord(
  alert: Alert,
  verdict: Verdict,
  call: PhoneCall | null,
): DecisionRecord {
  const action = actionFromVerdict(alert, verdict)
  // 상사가 이 경보를 지목했다면 결과 화면에 지시와 선택을 함께 남긴다.
  // 틀린 경보 밑에 "상사 말을 따랐다"가 드러나는 것이 이 장치의 전부다.
  const ordered = call?.alertId === alert.id ? call : null

  return {
    ...(ordered
      ? { order: ordered.order, orderFollowed: action === ordered.order }
      : {}),
    alertId: alert.id,
    title: alert.title,
    category: alert.category,
    severity: alert.severity,
    action,
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
    memoLog: [],
    phone: null,
    phoneLog: null,
    phoneAnswered: 0,
    phoneMissed: 0,
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
 *
 * 띄우는 즉시 `memoLog`에도 넣는다. 닫으면 사라지는데 연결 경보는 최대
 * 17초 뒤에 오므로, 다시 읽을 데가 없으면 방해만 남고 정보는 못 준다.
 */
export function showMemo(
  state: GameState,
  memo: Memo,
  elapsedMs: number,
): GameState {
  // 메모와 전화는 같은 시각에 뜨지 않는다. 둘 다 판정을 막으므로 겹치면
  // 경보를 볼 수 없는 구간이 생긴다(14.5).
  return state.phase !== 'PLAYING' || state.activeMemo || state.phone
    ? state
    : {
        ...state,
        activeMemo: { memo, shownAtMs: elapsedMs },
        memoLog: [...state.memoLog, memo],
        memosShown: state.memosShown + 1,
      }
}

/**
 * 화면에 `MEMO.readThresholdMs` 이상 떠 있다가 닫히면 읽은 것으로 센다.
 *
 * **근무 중이 아니면 닫지 않는다.** 일시정지에서는 메모가 그려지지 않는데
 * SPACE 리스너는 살아 있다. 보이지 않는 메모를 닫을 수 있으면 일시정지가
 * 이득이 된다 — 근무 시계는 메모를 읽는 동안에도 흐르지만 일시정지에서는
 * 멈추므로, 멈춰 세운 뒤 닫으면 읽는 값을 30초에서 내지 않는다.
 */
export function dismissMemo(state: GameState, elapsedMs: number): GameState {
  if (state.phase !== 'PLAYING' || !state.activeMemo) {
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

/**
 * 팝업이 판정을 막고 있는가. 규칙은 `docs/GAME_SPEC.md` 14.6.
 *
 * `나중에`로 내린 전화는 막지 않는다. 미루는 대신 경보를 처리할 수 있어야
 * 미루는 선택에 값이 생긴다(14.5).
 *
 * `!== null`이 아니라 참/거짓으로 본다. 필드가 없는 상태(undefined)에서
 * 판정이 영구히 막히는 사고를 메모에서 한 번 겪었다.
 */
export function isPhoneBlocking(state: GameState): boolean {
  return Boolean(state.phone) && state.phone?.status !== 'DEFERRED'
}

/** 벨이 울리기 시작한다. 호출은 새 경보가 뜨는 순간에만 한다(14.5). */
export function showPhone(
  state: GameState,
  call: PhoneCall,
  elapsedMs: number,
): GameState {
  return state.phase !== 'PLAYING' || state.phone || state.activeMemo
    ? state
    : {
        ...state,
        phone: { call, status: 'RINGING', ringStartedAtMs: elapsedMs },
        phoneLog: call,
      }
}

/**
 * `↑` 받기. 벨 시계가 멈추고 통화로 넘어간다.
 *
 * **근무 중이 아니면 손대지 못한다.** 아래 셋 모두 같은 가드를 갖는다.
 * 일시정지에서는 팝업이 그려지지 않는데 방향키 리스너는 살아 있다. 보이지
 * 않는 전화를 받을 수 있으면 일시정지가 이득이 된다 — 벨은 경과 시간으로
 * 재고 일시정지에서는 경과가 늘지 않으므로, 멈춰 세운 뒤 받으면 라이프를
 * 잃을 위험 없이 상사의 말을 읽는다. 14.5의 공정성 규칙은 그 반대를
 * 요구한다. `missPhone`과 `applyVerdict`가 이미 같은 가드를 갖고 있다.
 */
export function answerPhone(state: GameState): GameState {
  const phone = state.phone

  if (state.phase !== 'PLAYING' || !phone || phone.status === 'CONNECTED') {
    return state
  }

  return {
    ...state,
    phone: { ...phone, status: 'CONNECTED' },
    phoneAnswered: state.phoneAnswered + 1,
  }
}

/** `↓` 나중에. 팝업만 내린다. **벨 시계는 계속 간다**(14.3). */
export function deferPhone(state: GameState): GameState {
  const phone = state.phone

  if (state.phase !== 'PLAYING' || phone?.status !== 'RINGING') {
    return state
  }

  return { ...state, phone: { ...phone, status: 'DEFERRED' } }
}

/** `↓` 통화 종료. 전화가 끝난다. 기록은 phoneLog에 남는다. */
export function hangUpPhone(state: GameState): GameState {
  return state.phase === 'PLAYING' && state.phone?.status === 'CONNECTED'
    ? { ...state, phone: null }
    : state
}

/**
 * 벨이 다 갔다. 라이프 -1, 콤보 0.
 *
 * **`reviewed`는 올리지 않는다.** 경보를 검토한 것이 아니므로 Accuracy를
 * 오염시키면 안 된다. 미판정(TIMEOUT)과도 따로 센다(14.3).
 */
export function missPhone(state: GameState): GameState {
  if (state.phase !== 'PLAYING' || !state.phone || state.phone.status === 'CONNECTED') {
    return state
  }

  const lives = Math.max(0, state.lives - 1)

  return {
    ...state,
    phase: lives === 0 ? 'FAILURE' : state.phase,
    lives,
    combo: 0,
    phone: null,
    phoneMissed: state.phoneMissed + 1,
  }
}

export function decideCurrentAlert(
  state: GameState,
  action: Action,
): GameState {
  // 메모가 떠 있는 동안에는 판정을 받지 않는다. 눈 감고 누르는 사고를 막는다.
  //
  // `!== null`이 아니라 참/거짓으로 본다. 필드가 없는 상태(undefined)에서
  // `undefined !== null`은 참이라 판정이 영구히 막힌다. 화면은 버튼을
  // 정상으로 그려서 눌러도 반응만 없는 형태로 나타난다. 개발 서버에서
  // HMR로 코드만 갱신되고 판이 유지될 때 실제로 겪었다.
  if (
    state.currentAlert === null ||
    state.activeMemo ||
    isPhoneBlocking(state)
  ) {
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
      log: [...state.log, createRecord(alert, verdict, heardCall(state))],
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
    log: [...state.log, createRecord(alert, verdict, heardCall(state))],
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
