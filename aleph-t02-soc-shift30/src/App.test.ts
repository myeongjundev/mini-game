import { describe, expect, it } from 'vitest'

import { createGameReducerState, gameReducer } from './App'

describe('gameReducer', () => {
  it('owns the game state and alert queue together', () => {
    const ready = createGameReducerState()
    const playing = gameReducer(ready, { type: 'START' })
    const presented = gameReducer(playing, { type: 'PRESENT_ALERT' })

    expect(playing.game.phase).toBe('PLAYING')
    expect(presented.game.currentAlert).not.toBeNull()
    expect(presented.alertQueue).not.toBe(playing.alertQueue)
  })

  it('routes decisions and timeouts through the pure machine', () => {
    const playing = gameReducer(createGameReducerState(), { type: 'START' })
    const first = gameReducer(playing, { type: 'PRESENT_ALERT' })
    const action = first.game.currentAlert?.correctAction ?? 'ALLOW'
    const decided = gameReducer(first, { type: 'DECIDE', action })
    const second = gameReducer(decided, { type: 'PRESENT_ALERT' })
    const timedOut = gameReducer(second, { type: 'TIMEOUT' })

    expect(decided.game).toMatchObject({ reviewed: 1, currentAlert: null })
    expect(timedOut.game).toMatchObject({
      lives: 2,
      reviewed: 1,
      timeouts: 1,
      currentAlert: null,
    })
  })

  it('restarts the game and queue from a paused state', () => {
    const playing = gameReducer(createGameReducerState(), { type: 'START' })
    const presented = gameReducer(playing, { type: 'PRESENT_ALERT' })
    const paused = gameReducer(presented, { type: 'PAUSE' })
    const restarted = gameReducer(paused, { type: 'RESTART' })

    expect(restarted.game).toEqual(createGameReducerState().game)
    expect(restarted.alertQueue.remainingByTier).toEqual({ 1: [], 2: [], 3: [] })
  })
})
