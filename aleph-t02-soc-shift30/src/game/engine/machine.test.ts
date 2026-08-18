import { describe, expect, it } from 'vitest'

import { DIFFICULTY, VERDICT_FLASH_MS } from '../config'
import type { Alert, GameState } from '../types'
import {
  applyVerdict,
  createInitialGameState,
  decideCurrentAlert,
  pauseGame,
  presentAlert,
  restartGame,
  resumeGame,
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
    // 난이도 실험에서 eventIntervalMs를 1100으로 낮출 때도 성립해야 한다.
    expect(VERDICT_FLASH_MS).toBeLessThan(DIFFICULTY.eventIntervalMs)
    expect(VERDICT_FLASH_MS).toBeLessThan(1_100)
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
