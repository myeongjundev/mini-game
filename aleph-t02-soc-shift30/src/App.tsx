import { useCallback, useEffect, useReducer, useRef } from 'react'

import { DIFFICULTY } from './game/config'
import { ALERTS } from './game/data/alerts'
import {
  createAlertQueue,
  drawNextAlert,
  type AlertQueueState,
} from './game/engine/alertQueue'
import {
  createInitialGameState,
  decideCurrentAlert,
  pauseGame,
  presentAlert,
  restartGame,
  resumeGame,
  startGame,
  tick,
  timeoutCurrentAlert,
} from './game/engine/machine'
import { useGameLoop } from './game/hooks/useGameLoop'
import { useKeyboard } from './game/hooks/useKeyboard'
import { useVisibilityPause } from './game/hooks/useVisibilityPause'
import type { Action, GameState } from './game/types'

export type GameReducerState = {
  game: GameState
  alertQueue: AlertQueueState
}

export type GameAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'DECIDE'; action: Action }
  | { type: 'TIMEOUT' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'PRESENT_ALERT' }

export function createGameReducerState(): GameReducerState {
  return {
    game: createInitialGameState(),
    alertQueue: createAlertQueue(ALERTS),
  }
}

export function gameReducer(
  state: GameReducerState,
  action: GameAction,
): GameReducerState {
  switch (action.type) {
    case 'START':
      return { ...state, game: startGame(state.game) }
    case 'PAUSE':
      return { ...state, game: pauseGame(state.game) }
    case 'RESUME':
      return { ...state, game: resumeGame(state.game) }
    case 'RESTART': {
      const game = restartGame(state.game)

      return game === state.game
        ? state
        : {
            game,
            alertQueue: createAlertQueue(ALERTS, state.alertQueue.randomState),
          }
    }
    case 'DECIDE':
      return { ...state, game: decideCurrentAlert(state.game, action.action) }
    case 'TIMEOUT':
      return { ...state, game: timeoutCurrentAlert(state.game) }
    case 'TICK':
      return { ...state, game: tick(state.game, action.deltaMs) }
    case 'PRESENT_ALERT': {
      if (state.game.phase !== 'PLAYING' || state.game.currentAlert !== null) {
        return state
      }

      const elapsedMs = DIFFICULTY.totalTimeMs - state.game.timeLeftMs
      const draw = drawNextAlert(state.alertQueue, elapsedMs)

      return {
        game: presentAlert(state.game, draw.alert),
        alertQueue: draw.queue,
      }
    }
  }
}

export default function App() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    createGameReducerState,
  )
  const resolvedRef = useRef<string | null>(null)
  const currentAlertId = state.game.currentAlert?.id ?? null

  useEffect(() => {
    resolvedRef.current = null
  }, [currentAlertId])

  useEffect(() => {
    if (state.game.phase === 'PLAYING' && state.game.currentAlert === null) {
      dispatch({ type: 'PRESENT_ALERT' })
    }
  }, [state.game.currentAlert, state.game.phase])

  const handleDecide = useCallback(
    (action: Action) => {
      if (
        state.game.phase !== 'PLAYING' ||
        currentAlertId === null ||
        resolvedRef.current === currentAlertId
      ) {
        return
      }

      resolvedRef.current = currentAlertId
      dispatch({ type: 'DECIDE', action })
    },
    [currentAlertId, state.game.phase],
  )

  const handleTimeout = useCallback(() => {
    if (
      state.game.phase !== 'PLAYING' ||
      currentAlertId === null ||
      resolvedRef.current === currentAlertId
    ) {
      return
    }

    resolvedRef.current = currentAlertId
    dispatch({ type: 'TIMEOUT' })
  }, [currentAlertId, state.game.phase])

  const handleAllow = useCallback(() => {
    handleDecide('ALLOW')
  }, [handleDecide])

  const handleBlock = useCallback(() => {
    handleDecide('BLOCK')
  }, [handleDecide])

  const handleTick = useCallback((deltaMs: number) => {
    dispatch({ type: 'TICK', deltaMs })
  }, [])

  const handlePauseToggle = useCallback(() => {
    if (state.game.phase === 'PLAYING') {
      dispatch({ type: 'PAUSE' })
    } else if (state.game.phase === 'PAUSED') {
      dispatch({ type: 'RESUME' })
    }
  }, [state.game.phase])

  const handleVisibilityPause = useCallback(() => {
    dispatch({ type: 'PAUSE' })
  }, [])

  useGameLoop({
    isRunning: state.game.phase === 'PLAYING',
    currentAlertId,
    onTick: handleTick,
    onTimeout: handleTimeout,
  })
  useKeyboard(
    state.game.phase === 'PLAYING' || state.game.phase === 'PAUSED',
    {
      onAllow: handleAllow,
      onBlock: handleBlock,
      onPauseToggle: handlePauseToggle,
    },
  )
  useVisibilityPause(
    state.game.phase === 'PLAYING',
    handleVisibilityPause,
  )

  const visibleState = {
    phase: state.game.phase,
    timeLeftMs: state.game.timeLeftMs,
    lives: state.game.lives,
    score: state.game.score,
    combo: state.game.combo,
    reviewed: state.game.reviewed,
    timeouts: state.game.timeouts,
    currentAlert: state.game.currentAlert
      ? {
          id: state.game.currentAlert.id,
          title: state.game.currentAlert.title,
        }
      : null,
  }

  return (
    <main className="app-shell">
      <h1 className="app-title">SOC SHIFT:30</h1>
      <pre>{JSON.stringify(visibleState, null, 2)}</pre>
    </main>
  )
}
