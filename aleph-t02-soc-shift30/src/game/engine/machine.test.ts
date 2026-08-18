import { describe, expect, it } from 'vitest'

import { DIFFICULTY } from '../config'
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
