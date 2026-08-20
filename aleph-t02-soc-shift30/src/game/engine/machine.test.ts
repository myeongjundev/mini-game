import { describe, expect, it } from 'vitest'

import { DIFFICULTY, VERDICT_FLASH_MS } from '../config'
import { ALERTS } from '../data/alerts'
import { MEMOS } from '../data/memos'
import type { Alert, GameState } from '../types'
import {
  answerPhone,
  applyVerdict,
  createInitialGameState,
  decideCurrentAlert,
  deferPhone,
  dismissMemo,
  hangUpPhone,
  isPhoneBlocking,
  missPhone,
  pauseGame,
  presentAlert,
  restartGame,
  resumeGame,
  showMemo,
  showPhone,
  startGame,
  tick,
  timeoutCurrentAlert,
} from './machine'

const normalAlert = {
  correctAction: 'ALLOW',
  severity: 'LOW',
} as Alert
const threatAlert = {
  correctAction: 'BLOCK',
  severity: 'CRITICAL',
} as Alert

function playingState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(), phase: 'PLAYING', ...overrides }
}

describe('feedback timing', () => {
  it('keeps the verdict flash shorter than the alert interval', () => {
    // 같거나 길면 판정 표시가 끊기지 않아 다음 경보와 계속 겹친다.
    // 난이도 실험에서 eventIntervalMs를 낮추면 이 검사가 먼저 깨진다.
    expect(VERDICT_FLASH_MS).toBeLessThan(DIFFICULTY.eventIntervalMs)
  })
})

describe('game state machine', () => {
  it('creates and moves through ready, playing, and paused phases', () => {
    const ready = createInitialGameState()
    const playing = startGame(ready)
    const paused = pauseGame(playing)

    expect(ready).toMatchObject({
      phase: 'READY',
      timeLeftMs: DIFFICULTY.totalTimeMs,
      lives: DIFFICULTY.lives,
      score: 0,
      timeouts: 0,
    })
    expect(playing.phase).toBe('PLAYING')
    expect(paused.phase).toBe('PAUSED')
    expect(resumeGame(paused).phase).toBe('PLAYING')
    expect(restartGame(paused)).toEqual(createInitialGameState())
  })

  it('updates score, combo, and correct-decision counters', () => {
    const normalResult = applyVerdict(playingState(), 'CORRECT', normalAlert)
    const criticalResult = applyVerdict(
      playingState({ combo: 2, maxCombo: 2 }),
      'CORRECT',
      threatAlert,
    )

    expect(normalResult).toMatchObject({
      score: 100,
      combo: 1,
      maxCombo: 1,
      reviewed: 1,
      normalAllowed: 1,
      currentAlert: null,
      lastVerdict: 'CORRECT',
    })
    expect(criticalResult).toMatchObject({
      score: 400,
      combo: 3,
      maxCombo: 3,
      threatsBlocked: 1,
    })
  })

  it('presents and decides the current alert through pure machine functions', () => {
    const playing = playingState()
    const presented = presentAlert(playing, normalAlert)

    expect(presented.currentAlert).toBe(normalAlert)
    expect(presentAlert(presented, threatAlert)).toBe(presented)
    expect(decideCurrentAlert(presented, 'ALLOW')).toMatchObject({
      score: 100,
      reviewed: 1,
      normalAllowed: 1,
      currentAlert: null,
      lastVerdict: 'CORRECT',
    })
  })

  it('removes one life, resets combo, and tracks each wrong verdict', () => {
    const falsePositive = applyVerdict(
      playingState({ combo: 4, maxCombo: 4 }),
      'FALSE_POSITIVE',
      normalAlert,
    )
    const missedThreat = applyVerdict(
      playingState(),
      'MISSED_THREAT',
      threatAlert,
    )

    expect(falsePositive).toMatchObject({
      lives: 2,
      score: 0,
      combo: 0,
      maxCombo: 4,
      falsePositives: 1,
    })
    expect(missedThreat).toMatchObject({ lives: 2, missedThreats: 1 })
  })

  it('tracks TIMEOUT without changing reviewed or decision counters', () => {
    const state = playingState({
      lives: 2,
      score: 700,
      combo: 4,
      maxCombo: 4,
      reviewed: 9,
      threatsBlocked: 2,
      normalAllowed: 3,
      falsePositives: 1,
      missedThreats: 2,
      currentAlert: threatAlert,
    })

    expect(applyVerdict(state, 'TIMEOUT', threatAlert)).toMatchObject({
      phase: 'PLAYING',
      lives: 1,
      score: 700,
      combo: 0,
      maxCombo: 4,
      reviewed: 9,
      threatsBlocked: 2,
      normalAllowed: 3,
      falsePositives: 1,
      missedThreats: 2,
      timeouts: 1,
      currentAlert: null,
      lastVerdict: 'TIMEOUT',
    })
  })

  it('times out only when a current alert is present', () => {
    const playing = playingState({ lives: 2 })
    const presented = presentAlert(playing, threatAlert)

    expect(timeoutCurrentAlert(playing)).toBe(playing)
    expect(timeoutCurrentAlert(presented)).toMatchObject({
      lives: 1,
      timeouts: 1,
      currentAlert: null,
      lastVerdict: 'TIMEOUT',
    })
  })

  it('fails when a TIMEOUT consumes the final life', () => {
    expect(
      applyVerdict(playingState({ lives: 1 }), 'TIMEOUT', normalAlert),
    ).toMatchObject({ phase: 'FAILURE', lives: 0, timeouts: 1 })
  })

  it('fails on the final life and ignores verdicts outside playing', () => {
    const failure = applyVerdict(
      playingState({ lives: 1 }),
      'MISSED_THREAT',
      threatAlert,
    )

    expect(failure).toMatchObject({ phase: 'FAILURE', lives: 0 })
    expect(applyVerdict(failure, 'CORRECT', threatAlert)).toBe(failure)
    expect(restartGame(failure)).toEqual(createInitialGameState())
  })

  it('records every verdict in play order and restores the action taken', () => {
    const normal = {
      id: 'normal-1',
      title: 'NORMAL ONE',
      category: 'traffic',
      correctAction: 'ALLOW',
      severity: 'LOW',
      explanation: '정상 근거',
    } as Alert
    const threat = {
      id: 'threat-1',
      title: 'THREAT ONE',
      category: 'critical',
      correctAction: 'BLOCK',
      severity: 'CRITICAL',
      explanation: '위협 근거',
    } as Alert

    let state = playingState({ lives: 9 })
    state = applyVerdict(state, 'CORRECT', threat)
    state = applyVerdict(state, 'FALSE_POSITIVE', normal)
    state = applyVerdict(state, 'MISSED_THREAT', threat)
    state = applyVerdict(state, 'TIMEOUT', normal)

    expect(state.log).toHaveLength(4)
    expect(state.log.map((entry) => entry.verdict)).toEqual([
      'CORRECT',
      'FALSE_POSITIVE',
      'MISSED_THREAT',
      'TIMEOUT',
    ])
    expect(state.log.map((entry) => entry.action)).toEqual([
      'BLOCK',
      'BLOCK',
      'ALLOW',
      null,
    ])
    expect(state.log[0]).toMatchObject({
      alertId: 'threat-1',
      title: 'THREAT ONE',
      category: 'critical',
      severity: 'CRITICAL',
      explanation: '위협 근거',
    })
  })

  it('starts with an empty log and clears it on restart', () => {
    expect(createInitialGameState().log).toEqual([])

    const played = applyVerdict(playingState(), 'CORRECT', normalAlert)
    expect(played.log).toHaveLength(1)

    const finished = { ...played, phase: 'FAILURE' } as GameState
    expect(restartGame(finished).log).toEqual([])
  })

  it('does not record a verdict that arrives outside playing', () => {
    const ready = createInitialGameState()

    expect(applyVerdict(ready, 'CORRECT', normalAlert).log).toEqual([])
  })

  it('ticks only while playing and succeeds when time reaches zero', () => {
    const playing = playingState({ timeLeftMs: 100 })
    const paused = { ...playing, phase: 'PAUSED' } as GameState

    expect(tick(playing, 40).timeLeftMs).toBe(60)
    expect(tick(paused, 40)).toBe(paused)
    expect(tick(playing, Number.NaN)).toBe(playing)
    expect(tick(playing, 100)).toMatchObject({
      phase: 'SUCCESS',
      timeLeftMs: 0,
    })
  })
})

describe('memo log', () => {
  // 메모는 닫으면 사라지는데 연결 경보는 최대 17초 뒤에 온다. 다시 읽을
  // 데가 없으면 방해만 남고 정보는 못 준다. GAME_SPEC 13.6-1.
  it('keeps every memo in play order so it can be read again', () => {
    let state = playingState()
    state = showMemo(state, MEMOS[0], 3_000)
    state = dismissMemo(state, 4_000)
    state = showMemo(state, MEMOS[1], 7_000)

    expect(state.memoLog.map((memo) => memo.id)).toEqual([
      MEMOS[0].id,
      MEMOS[1].id,
    ])
  })

  it('starts empty and clears on restart', () => {
    expect(createInitialGameState().memoLog).toEqual([])

    const shown = showMemo(playingState(), MEMOS[0], 3_000)
    expect(shown.memoLog).toHaveLength(1)

    const finished = { ...shown, phase: 'FAILURE' } as GameState
    expect(restartGame(finished).memoLog).toEqual([])
  })

  it('does not record a memo that was refused', () => {
    // 이미 떠 있으면 새 메모를 받지 않는다. 로그에도 들어가면 안 된다.
    const first = showMemo(playingState(), MEMOS[0], 3_000)
    const second = showMemo(first, MEMOS[1], 7_000)

    expect(second.memoLog).toHaveLength(1)
  })
})

describe('상사의 전화', () => {
  const call = {
    alertId: 'contractor-proddb',
    order: 'ALLOW' as const,
    truthful: false,
    caller: '관제 팀장',
    message: '협력업체 접근 건, 급해서 내가 열어줬어. 통과시켜.',
  }
  const ringing = () => showPhone(playingState(), call, 21_000)

  it('벨이 울리기 시작하고 기록에 남는다', () => {
    const state = ringing()

    expect(state.phone).toMatchObject({ status: 'RINGING', ringStartedAtMs: 21_000 })
    expect(state.phoneLog).toBe(call)
  })

  it('메모가 떠 있으면 걸려 오지 않는다', () => {
    // 둘 다 판정을 막으므로 겹치면 경보를 볼 수 없는 구간이 생긴다. 14.5.
    const withMemo = showMemo(playingState(), MEMOS[0], 3_000)

    expect(showPhone(withMemo, call, 21_000).phone).toBeNull()
  })

  it('전화가 떠 있으면 메모가 뜨지 않는다', () => {
    expect(showMemo(ringing(), MEMOS[0], 21_000).activeMemo).toBeNull()
  })

  it('받으면 통화로 넘어가고 세어진다', () => {
    const answered = answerPhone(ringing())

    expect(answered.phone?.status).toBe('CONNECTED')
    expect(answered.phoneAnswered).toBe(1)
  })

  it('나중으로 내렸다가도 받을 수 있다', () => {
    const deferred = deferPhone(ringing())

    expect(deferred.phone?.status).toBe('DEFERRED')
    expect(answerPhone(deferred).phone?.status).toBe('CONNECTED')
  })

  it('통화를 끊으면 전화가 사라지고 기록은 남는다', () => {
    const done = hangUpPhone(answerPhone(ringing()))

    expect(done.phone).toBeNull()
    expect(done.phoneLog).toBe(call)
  })

  it('수신과 통화는 판정을 막고 나중에는 막지 않는다', () => {
    // 미루는 대신 경보를 처리할 수 있어야 미루는 선택에 값이 생긴다. 14.5.
    expect(isPhoneBlocking(ringing())).toBe(true)
    expect(isPhoneBlocking(answerPhone(ringing()))).toBe(true)
    expect(isPhoneBlocking(deferPhone(ringing()))).toBe(false)
    expect(isPhoneBlocking(playingState())).toBe(false)
  })

  it('벨이 울리는 동안에는 판정이 먹지 않는다', () => {
    const alert = ALERTS[0]
    const state = showPhone(presentAlert(playingState(), alert), call, 21_000)

    expect(decideCurrentAlert(state, alert.correctAction).reviewed).toBe(0)
  })

  it('나중으로 내리면 그 경보를 정상으로 판정한다', () => {
    const alert = ALERTS[0]
    const state = deferPhone(
      showPhone(presentAlert(playingState(), alert), call, 21_000),
    )

    expect(decideCurrentAlert(state, alert.correctAction).reviewed).toBe(1)
  })

  it('벨을 놓치면 라이프와 콤보를 잃되 검토 수는 그대로다', () => {
    // 경보를 검토한 것이 아니므로 Accuracy를 오염시키면 안 된다. 14.3.
    const missed = missPhone({ ...ringing(), lives: 3, combo: 4, reviewed: 7 })

    expect(missed).toMatchObject({
      lives: 2,
      combo: 0,
      reviewed: 7,
      phoneMissed: 1,
      phone: null,
    })
  })

  it('마지막 라이프였으면 그대로 진다', () => {
    expect(missPhone({ ...ringing(), lives: 1 })).toMatchObject({
      phase: 'FAILURE',
      lives: 0,
    })
  })

  it('이미 받은 전화는 벨을 놓칠 수 없다', () => {
    const answered = answerPhone(ringing())

    expect(missPhone(answered)).toBe(answered)
  })

  it('다시 시작하면 전화가 남지 않는다', () => {
    const finished = { ...ringing(), phase: 'FAILURE' } as GameState

    expect(restartGame(finished)).toMatchObject({
      phone: null,
      phoneLog: null,
      phoneAnswered: 0,
      phoneMissed: 0,
    })
  })
})

describe('전화가 지목한 경보의 판정 기록', () => {
  // 틀린 경보 밑에 "상사 말을 따랐다"가 드러나는 것이 이 장치의 전부다. 14.8.
  const target = ALERTS.find((alert) => alert.id === 'contractor-proddb')!
  const call = {
    alertId: target.id,
    order: 'ALLOW' as const,
    truthful: false,
    caller: '관제 팀장',
    message: '통과시켜.',
  }
  const withCall = (overrides = {}) =>
    ({ ...playingState(), phoneLog: call, ...overrides }) as GameState

  it('지시를 따라 틀리면 따랐다고 남는다', () => {
    const state = applyVerdict(withCall(), 'MISSED_THREAT', target)

    expect(state.log[0]).toMatchObject({ order: 'ALLOW', orderFollowed: true })
  })

  it('지시를 어기고 맞히면 어겼다고 남는다', () => {
    const state = applyVerdict(withCall(), 'CORRECT', target)

    expect(state.log[0]).toMatchObject({ order: 'ALLOW', orderFollowed: false })
  })

  it('미판정은 따르지도 어기지도 않은 것이다', () => {
    const state = applyVerdict(withCall({ lives: 3 }), 'TIMEOUT', target)

    expect(state.log[0]).toMatchObject({ order: 'ALLOW', orderFollowed: false })
  })

  it('지목하지 않은 경보에는 지시를 붙이지 않는다', () => {
    const other = ALERTS.find((alert) => alert.id !== target.id)!
    const state = applyVerdict(withCall(), 'CORRECT', other)

    expect(state.log[0].order).toBeUndefined()
    expect(state.log[0].orderFollowed).toBeUndefined()
  })

  it('전화가 없던 판에는 아무 경보에도 붙지 않는다', () => {
    const state = applyVerdict(playingState(), 'CORRECT', target)

    expect(state.log[0].order).toBeUndefined()
  })
})

describe('memo guards tolerate a state without the memo fields', () => {
  // 개발 서버에서 HMR로 코드만 갱신되면 리듀서 상태는 이전 판 그대로다.
  // 그 상태에는 activeMemo가 없어 undefined인데, `undefined !== null`이
  // 참이라 판정이 영구히 막혔다. 화면은 버튼을 정상으로 그려서 눌러도
  // 반응만 없는 형태로 나타났다. 실제로 겪은 버그다.
  const legacyState = () => {
    const state: Record<string, unknown> = {
      ...createInitialGameState(),
      phase: 'PLAYING',
    }
    delete state.activeMemo

    return state as unknown as GameState
  }

  it('still accepts judgment when activeMemo is missing', () => {
    const alert = ALERTS[0]
    const playing = presentAlert(legacyState(), alert)
    const decided = decideCurrentAlert(playing, alert.correctAction)

    expect(decided.reviewed).toBe(1)
    expect(decided.currentAlert).toBeNull()
  })

  it('still shows a memo when activeMemo is missing', () => {
    const shown = showMemo(legacyState(), MEMOS[0], 3_000)

    expect(shown.activeMemo).not.toBeNull()
  })

  it('does not throw when dismissing without an active memo', () => {
    expect(() => dismissMemo(legacyState(), 3_000)).not.toThrow()
  })
})
