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

describe('memo interruptions', () => {
  const playUntilMemo = () => {
    let state = gameReducer(createGameReducerState(), { type: 'START' })

    // 첫 슬롯 자격 시각을 넘긴 뒤 새 경보가 뜨는 순간에만 끼어든다.
    // 라이프가 먼저 소진되면 PLAYING을 벗어나므로 정답으로 넘긴다.
    for (let index = 0; index < 40 && state.game.activeMemo === null; index += 1) {
      state = gameReducer(state, { type: 'PRESENT_ALERT' })
      if (state.game.activeMemo) break
      const correct = state.game.currentAlert?.correctAction ?? 'ALLOW'
      state = gameReducer(state, { type: 'DECIDE', action: correct })
      state = gameReducer(state, { type: 'TICK', deltaMs: 500 })
    }

    return state
  }

  it('never interrupts before the first slot time', () => {
    let state = gameReducer(createGameReducerState(), { type: 'START' })
    state = gameReducer(state, { type: 'PRESENT_ALERT' })

    expect(state.game.activeMemo).toBeNull()
    expect(state.game.memosShown).toBe(0)
  })

  it('shows a memo only when a fresh alert appears', () => {
    const state = playUntilMemo()

    expect(state.game.activeMemo).not.toBeNull()
    expect(state.game.memosShown).toBe(1)
    // 공정성 규칙: 메모는 갓 뜬 경보와 함께 온다. 남은 시간이 충분하다.
    expect(state.game.currentAlert).not.toBeNull()
  })

  it('blocks judgment while a memo is up', () => {
    const state = playUntilMemo()
    const blocked = gameReducer(state, { type: 'DECIDE', action: 'ALLOW' })

    expect(blocked.game).toBe(state.game)
    expect(blocked.game.reviewed).toBe(state.game.reviewed)
  })

  it('counts a memo as read only after the threshold', () => {
    const shown = playUntilMemo()

    const rushed = gameReducer(shown, { type: 'DISMISS_MEMO' })
    expect(rushed.game.activeMemo).toBeNull()
    expect(rushed.game.memosRead).toBe(0)

    const waited = gameReducer(
      gameReducer(shown, { type: 'TICK', deltaMs: 700 }),
      { type: 'DISMISS_MEMO' },
    )
    expect(waited.game.memosRead).toBe(1)
  })

  it('accepts judgment again once the memo is dismissed', () => {
    const dismissed = gameReducer(playUntilMemo(), { type: 'DISMISS_MEMO' })
    const decided = gameReducer(dismissed, { type: 'DECIDE', action: 'ALLOW' })

    expect(decided.game.reviewed).toBe(dismissed.game.reviewed + 1)
  })

  it('resets memo progress on restart', () => {
    const shown = playUntilMemo()
    const restarted = gameReducer(
      gameReducer(shown, { type: 'PAUSE' }),
      { type: 'RESTART' },
    )

    expect(restarted.game.activeMemo).toBeNull()
    expect(restarted.game.memosShown).toBe(0)
    expect(restarted.game.memosRead).toBe(0)
    expect(restarted.memoPlan.shown).toBe(0)
  })
})
