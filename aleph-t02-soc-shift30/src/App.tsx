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
import MemoLog from './components/MemoLog'
import MemoToast from './components/MemoToast'
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
  dismissMemo,
  pauseGame,
  presentAlert,
  restartGame,
  resumeGame,
  showMemo,
  startGame,
  tick,
  timeoutCurrentAlert,
} from './game/engine/machine'
import { createMemoPlan, takeDueMemo, type MemoPlan } from './game/engine/memoQueue'
import { useGameLoop } from './game/hooks/useGameLoop'
import { useKeyboard } from './game/hooks/useKeyboard'
import { useVisibilityPause } from './game/hooks/useVisibilityPause'
import type { Action, GameState, Verdict } from './game/types'
import { audioEngine } from './services/audio'
import { loadInitialSaved, saveSaved, type Saved } from './services/storage'

export type GameReducerState = {
  game: GameState
  alertQueue: AlertQueueState
  memoPlan: MemoPlan
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
  | { type: 'DISMISS_MEMO' }

export function createGameReducerState(): GameReducerState {
  const alertQueue = createAlertQueue(ALERTS)

  return {
    game: createInitialGameState(),
    alertQueue,
    memoPlan: createMemoPlan(alertQueue.randomState),
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

      if (game === state.game) {
        return state
      }

      const alertQueue = createAlertQueue(ALERTS, state.alertQueue.randomState)

      return { game, alertQueue, memoPlan: createMemoPlan(alertQueue.randomState) }
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
      // 메모는 새 경보가 뜨는 이 순간에만 끼어든다. GAME_SPEC 13.3절.
      const due = takeDueMemo(state.memoPlan, elapsedMs)
      const presented = presentAlert(state.game, draw.alert)

      return {
        game: due ? showMemo(presented, due.memo, elapsedMs) : presented,
        alertQueue: draw.queue,
        memoPlan: due ? due.plan : state.memoPlan,
      }
    }
    case 'DISMISS_MEMO':
      return {
        ...state,
        game: dismissMemo(
          state.game,
          DIFFICULTY.totalTimeMs - state.game.timeLeftMs,
        ),
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
  const volumeRef = useRef(saved.volume)
  const alertProgressRef = useRef<{
    id: string | null
    startTimeLeftMs: number
  }>({
    id: null as string | null,
    startTimeLeftMs: DIFFICULTY.totalTimeMs,
  })
  const currentAlertId = state.game.currentAlert?.id ?? null
  const isMemoOpen = Boolean(state.game.activeMemo)
  // 메모가 떠 있는 동안 흘러간 시간. 경보 제한 시간에서 빼야 눈금과
  // 실제 만료 시각이 어긋나지 않는다. useGameLoop의 동결과 같은 규칙이다.
  const memoFrozenMsRef = useRef(0)
  const isMemoOpenRef = useRef(isMemoOpen)
  isMemoOpenRef.current = isMemoOpen
  muteRef.current = saved.mute
  volumeRef.current = saved.volume

  if (alertProgressRef.current.id !== currentAlertId) {
    alertProgressRef.current = {
      id: currentAlertId,
      startTimeLeftMs: state.game.timeLeftMs,
    }
    memoFrozenMsRef.current = 0
  }

  const alertTimeRemainingRatio = currentAlertId === null
    ? 0
    : 1 -
      (alertProgressRef.current.startTimeLeftMs -
        state.game.timeLeftMs -
        memoFrozenMsRef.current) /
        DIFFICULTY.eventIntervalMs

  // 판정을 보냈다는 표시는 다음 렌더까지만 유효하다. 렌더가 한 번 돌았다면
  // 리듀서는 그 판정을 이미 처리했고, 받아들여졌다면 경보가 바뀌어 있다.
  //
  // 표시를 남겨두면 리듀서가 거부한 판정도 처리된 것으로 남는다. 그 경보는
  // 판정도 만료도 되지 않고, 다음 경보도 오지 않으며, 근무 시계만 흐른다.
  // 같은 프레임 안의 연타를 막는 것이 이 표시의 유일한 역할이다.
  useEffect(() => {
    resolvedRef.current = null
  })

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
    audioEngine.play(verdict === 'CORRECT' ? 'CORRECT' : 'INCORRECT', muteRef.current, volumeRef.current)
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
      audioEngine.play('CRITICAL', muteRef.current, volumeRef.current)
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
      // 메모 중에는 리듀서가 판정을 거부한다(GAME_SPEC 13절). 버튼은 비활성이라
      // 여기까지 오지 않지만 키보드에는 막을 것이 없다. 거부될 판정을 보내면
      // 아래에서 처리 표시만 남아 그 경보가 판정도 만료도 되지 않는다.
      if (
        state.game.phase !== 'PLAYING' ||
        currentAlertId === null ||
        isMemoOpen ||
        resolvedRef.current === currentAlertId
      ) {
        return
      }

      lastExplanationRef.current = state.game.currentAlert?.explanation ?? ''
      lastDecisiveFactRef.current = state.game.currentAlert?.decisiveFact ?? ''
      resolvedRef.current = currentAlertId
      dispatch({ type: 'DECIDE', action })
    },
    [currentAlertId, isMemoOpen, state.game.phase],
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
    if (isMemoOpenRef.current) {
      memoFrozenMsRef.current += deltaMs
    }
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

  const updateSaved = useCallback((update: Partial<Pick<Saved, 'mute' | 'volume' | 'reduceMotion'>>) => {
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

  // 단계를 돌려가며 고른다. 자리가 좁아 슬라이더를 놓을 수 없고,
  // SOUND // ON 과 같은 표시 방식으로 맞춘다.
  const handleSetVolume = useCallback((level: Saved['volume']) => {
    updateSaved({ volume: level })
  }, [updateSaved])

  const handleDismissMemo = useCallback(() => {
    dispatch({ type: 'DISMISS_MEMO' })
  }, [])

  const keyboardHandlers = useMemo(
    () => ({
      onAllow: handleAllow,
      onBlock: handleBlock,
      onPauseToggle: handlePauseToggle,
      // 메모가 떠 있을 때만 넘긴다. 항상 넘기면 SPACE가 늘 가로채여
      // 포커스된 버튼이 SPACE로 눌리지 않는다.
      onDismissMemo: isMemoOpen ? handleDismissMemo : undefined,
    }),
    [handleAllow, handleBlock, handlePauseToggle, handleDismissMemo, isMemoOpen],
  )

  useGameLoop({
    isRunning: state.game.phase === 'PLAYING',
    currentAlertId,
    isAlertClockFrozen: isMemoOpen,
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
          volume={saved.volume}
          reduceMotion={saved.reduceMotion}
          playIntro={!hasSeenLobbyIntro}
          onIntroComplete={handleLobbyIntroComplete}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
          onSetVolume={handleSetVolume}
          onToggleReduceMotion={handleToggleReduceMotion}
        />
      ) : null}

      {state.game.phase === 'PLAYING' ? (
        <>
          <Hud state={state.game} />
          {/* 메모는 경보 카드 위를 덮는다. 시선이 이미 여기 있어서 놓치지 않고,
              화면 높이가 늘지 않으며, 화면 아래 판정 표시와 겹치지도 않는다.
              가려도 불공정하지 않은 이유는 경보 제한 시간이 멈추기 때문이다. */}
          <div className="alert-stage">
            {state.game.currentAlert ? (
              <AlertCard
                alert={state.game.currentAlert}
                timeRemainingRatio={alertTimeRemainingRatio}
              />
            ) : (
              <div className="alert-placeholder" aria-live="polite">SCANNING…</div>
            )}
            {state.game.activeMemo ? (
              <MemoToast
                memo={state.game.activeMemo.memo}
                onDismiss={handleDismissMemo}
              />
            ) : null}
          </div>
          {/* 버튼은 사라지지 않고 자리를 지킨다. 메모 중에는 판정이 막히므로
              비활성으로 둔다. 눌리지 않는 이유가 화면에 드러나야 한다. */}
          <ActionButtons
            disabled={state.game.currentAlert === null || isMemoOpen}
            onDecide={handleDecide}
          />
          <MemoLog memos={state.game.memoLog} />
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
