import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

import ActionButtons from './components/ActionButtons'
import AlertCard from './components/AlertCard'
import Hud from './components/Hud'
import SettingsBar from './components/SettingsBar'
import VerdictFlash from './components/VerdictFlash'
import PausedScreen from './components/screens/PausedScreen'
import ReadyScreen from './components/screens/ReadyScreen'
import ResultScreen from './components/screens/ResultScreen'
import { DIFFICULTY, VERDICT_FLASH_MS } from './game/config'
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
import type { Action, GameState, Verdict } from './game/types'
import { audioEngine } from './services/audio'
import { loadInitialSaved, saveSaved, type Saved } from './services/storage'

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
  const [saved, setSaved] = useState(loadInitialSaved)
  const [hasSeenLobbyIntro, setHasSeenLobbyIntro] = useState(false)
  const [feedback, setFeedback] = useState<{
    verdict: Verdict
    decisiveFact: string
    explanation: string
  } | null>(null)
  const resolvedRef = useRef<string | null>(null)
  const lastExplanationRef = useRef('')
  const lastDecisiveFactRef = useRef('')
  const muteRef = useRef(saved.mute)
  const alertProgressRef = useRef<{
    id: string | null
    startTimeLeftMs: number
  }>({
    id: null as string | null,
    startTimeLeftMs: DIFFICULTY.totalTimeMs,
  })
  const currentAlertId = state.game.currentAlert?.id ?? null
  muteRef.current = saved.mute

  if (alertProgressRef.current.id !== currentAlertId) {
    alertProgressRef.current = {
      id: currentAlertId,
      startTimeLeftMs: state.game.timeLeftMs,
    }
  }

  const alertTimeRemainingRatio = currentAlertId === null
    ? 0
    : 1 -
      (alertProgressRef.current.startTimeLeftMs - state.game.timeLeftMs) /
        DIFFICULTY.eventIntervalMs

  useEffect(() => {
    resolvedRef.current = null
  }, [currentAlertId])

  useEffect(() => {
    if (state.game.phase === 'PLAYING' && state.game.currentAlert === null) {
      dispatch({ type: 'PRESENT_ALERT' })
    }
  }, [state.game.currentAlert, state.game.phase])

  useEffect(() => {
    const verdict = state.game.lastVerdict

    if (verdict === null) {
      return
    }

    setFeedback({
      verdict,
      decisiveFact: lastDecisiveFactRef.current,
      explanation: lastExplanationRef.current,
    })
    audioEngine.play(verdict === 'CORRECT' ? 'CORRECT' : 'INCORRECT', muteRef.current)
    const timeoutId = window.setTimeout(
      () => setFeedback(null),
      VERDICT_FLASH_MS,
    )

    return () => window.clearTimeout(timeoutId)
  }, [state.game.reviewed, state.game.timeouts])

  // 경고음을 severity가 아니라 tier로 건다.
  // severity는 정답과 상관이 높아 소리만으로 답이 새기 때문이다.
  // tier는 카드에 이미 표시되므로 새로 노출되는 정보가 없다.
  useEffect(() => {
    if (state.game.currentAlert?.tier === 3) {
      audioEngine.play('CRITICAL', muteRef.current)
    }
  }, [currentAlertId, state.game.currentAlert?.tier])

  useEffect(() => () => audioEngine.disable(), [])

  useEffect(() => {
    if (
      (state.game.phase === 'SUCCESS' || state.game.phase === 'FAILURE') &&
      state.game.score > saved.bestScore
    ) {
      const next = { ...saved, bestScore: state.game.score }
      setSaved(next)
      saveSaved(next)
    }
  }, [saved, state.game.phase, state.game.score])

  const handleDecide = useCallback(
    (action: Action) => {
      if (
        state.game.phase !== 'PLAYING' ||
        currentAlertId === null ||
        resolvedRef.current === currentAlertId
      ) {
        return
      }

      lastExplanationRef.current = state.game.currentAlert?.explanation ?? ''
      lastDecisiveFactRef.current = state.game.currentAlert?.decisiveFact ?? ''
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

    lastExplanationRef.current = state.game.currentAlert?.explanation ?? ''
    lastDecisiveFactRef.current = state.game.currentAlert?.decisiveFact ?? ''
    resolvedRef.current = currentAlertId
    dispatch({ type: 'TIMEOUT' })
  }, [currentAlertId, state.game.currentAlert, state.game.phase])

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

  const handleStart = useCallback(() => {
    if (!muteRef.current) {
      audioEngine.enable()
    }
    setFeedback(null)
    dispatch({ type: 'START' })
  }, [])

  const handleLobbyIntroComplete = useCallback(() => {
    setHasSeenLobbyIntro(true)
  }, [])

  const handleResume = useCallback(() => {
    dispatch({ type: 'RESUME' })
  }, [])

  const handleRestart = useCallback(() => {
    setFeedback(null)
    dispatch({ type: 'RESTART' })
  }, [])

  const updateSaved = useCallback((update: Partial<Pick<Saved, 'mute' | 'reduceMotion'>>) => {
    setSaved((previous) => {
      const next = { ...previous, ...update }
      saveSaved(next)
      return next
    })
  }, [])

  const handleToggleMute = useCallback(() => {
    if (saved.mute) {
      audioEngine.enable()
    } else {
      audioEngine.disable()
    }
    updateSaved({ mute: !saved.mute })
  }, [saved.mute, updateSaved])

  const handleToggleReduceMotion = useCallback(() => {
    updateSaved({ reduceMotion: !saved.reduceMotion })
  }, [saved.reduceMotion, updateSaved])

  const keyboardHandlers = useMemo(
    () => ({
      onAllow: handleAllow,
      onBlock: handleBlock,
      onPauseToggle: handlePauseToggle,
    }),
    [handleAllow, handleBlock, handlePauseToggle],
  )

  useGameLoop({
    isRunning: state.game.phase === 'PLAYING',
    currentAlertId,
    onTick: handleTick,
    onTimeout: handleTimeout,
  })
  useKeyboard(
    state.game.phase === 'PLAYING' || state.game.phase === 'PAUSED',
    keyboardHandlers,
  )
  useVisibilityPause(
    state.game.phase === 'PLAYING',
    handleVisibilityPause,
  )

  return (
    <main
      className={`app-shell${state.game.phase === 'READY' ? ' app-shell-lobby' : ''}`}
      data-reduce-motion={saved.reduceMotion ? 'true' : 'false'}
      data-feedback={
        feedback?.verdict.toLowerCase().replaceAll('_', '-') ?? undefined
      }
    >
      {state.game.phase !== 'READY' ? (
        <header className="app-header">
          <h1 className="app-title">SOC SHIFT:30</h1>
          <span className="app-status">{state.game.phase}</span>
        </header>
      ) : null}

      {state.game.phase === 'READY' ? (
        <ReadyScreen
          bestScore={saved.bestScore}
          mute={saved.mute}
          reduceMotion={saved.reduceMotion}
          playIntro={!hasSeenLobbyIntro}
          onIntroComplete={handleLobbyIntroComplete}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
          onToggleReduceMotion={handleToggleReduceMotion}
        />
      ) : null}

      {state.game.phase === 'PLAYING' ? (
        <>
          <Hud state={state.game} />
          {state.game.currentAlert ? (
            <AlertCard
              alert={state.game.currentAlert}
              timeRemainingRatio={alertTimeRemainingRatio}
            />
          ) : (
            <div className="alert-placeholder" aria-live="polite">SCANNING…</div>
          )}
          <ActionButtons
            disabled={state.game.currentAlert === null}
            onDecide={handleDecide}
          />
        </>
      ) : null}

      {state.game.phase === 'PAUSED' ? (
        <>
          <Hud state={state.game} />
          <PausedScreen onResume={handleResume} onRestart={handleRestart} />
        </>
      ) : null}

      {state.game.phase === 'SUCCESS' || state.game.phase === 'FAILURE' ? (
        <ResultScreen
          state={state.game}
          bestScore={Math.max(saved.bestScore, state.game.score)}
          onRestart={handleRestart}
        />
      ) : null}

      {feedback ? (
        <VerdictFlash
          verdict={feedback.verdict}
          decisiveFact={feedback.decisiveFact}
          explanation={feedback.explanation}
        />
      ) : null}

      {state.game.phase !== 'READY' ? <SettingsBar
        mute={saved.mute}
        reduceMotion={saved.reduceMotion}
        pauseDisabled={
          state.game.phase !== 'PLAYING' && state.game.phase !== 'PAUSED'
        }
        isPaused={state.game.phase === 'PAUSED'}
        onToggleMute={handleToggleMute}
        onToggleReduceMotion={handleToggleReduceMotion}
        onPauseToggle={handlePauseToggle}
      /> : null}
    </main>
  )
}
