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
import PhoneOverlay from './components/PhoneOverlay'
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
  answerPhone,
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
} from './game/engine/machine'
import { createMemoPlan, takeDueMemo, type MemoPlan } from './game/engine/memoQueue'
import {
  createPhonePlan,
  isPhoneDue,
  isRingExpired,
  resolvePhoneCall,
  ringProgress,
  type PhonePlan,
} from './game/engine/phoneQueue'
import { useGameLoop } from './game/hooks/useGameLoop'
import { useKeyboard } from './game/hooks/useKeyboard'
import { useMenuKeys } from './game/hooks/useMenuKeys'
import { useVisibilityPause } from './game/hooks/useVisibilityPause'
import type { Action, GameState, Verdict } from './game/types'
import { audioEngine } from './services/audio'
import { loadInitialSaved, saveSaved, type Saved } from './services/storage'

export type GameReducerState = {
  game: GameState
  alertQueue: AlertQueueState
  memoPlan: MemoPlan
  phonePlan: PhonePlan
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
  | { type: 'ANSWER_PHONE' }
  | { type: 'DEFER_PHONE' }
  | { type: 'HANGUP_PHONE' }
  | { type: 'MISS_PHONE' }

export function createGameReducerState(): GameReducerState {
  const alertQueue = createAlertQueue(ALERTS)

  return {
    game: createInitialGameState(),
    alertQueue,
    memoPlan: createMemoPlan(alertQueue.randomState),
    phonePlan: createPhonePlan(alertQueue.randomState),
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

      return {
        game,
        alertQueue,
        memoPlan: createMemoPlan(alertQueue.randomState),
        phonePlan: createPhonePlan(alertQueue.randomState),
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
      // 메모는 새 경보가 뜨는 이 순간에만 끼어든다. GAME_SPEC 13.3절.
      const due = takeDueMemo(state.memoPlan, elapsedMs)
      const presented = presentAlert(state.game, draw.alert)
      const withMemo = due
        ? showMemo(presented, due.memo, elapsedMs)
        : presented

      // 전화도 새 경보가 뜨는 이 순간에만 끼어든다. 메모가 떴으면 이번에는
      // 걸지 않는다. 둘 다 판정을 막아 겹치면 경보를 볼 수 없다(14.5).
      // 지목할 경보는 큐를 읽어서 고른다. 큐는 바뀌지 않는다(14.4).
      const phoneDue =
        !due && isPhoneDue(state.phonePlan, elapsedMs)
          ? resolvePhoneCall(
              draw.queue,
              state.phonePlan.order,
              state.game.memoLog.map((memo) => memo.alertId),
            )
          : null

      return {
        game: phoneDue
          ? showPhone(withMemo, phoneDue, elapsedMs)
          : withMemo,
        alertQueue: draw.queue,
        memoPlan: due ? due.plan : state.memoPlan,
        phonePlan: phoneDue
          ? { ...state.phonePlan, shown: state.phonePlan.shown + 1 }
          : state.phonePlan,
      }
    }
    case 'ANSWER_PHONE':
      return { ...state, game: answerPhone(state.game) }
    case 'DEFER_PHONE':
      return { ...state, game: deferPhone(state.game) }
    case 'HANGUP_PHONE':
      return { ...state, game: hangUpPhone(state.game) }
    case 'MISS_PHONE':
      return { ...state, game: missPhone(state.game) }
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
  const volumeRef = useRef(saved.volumeStep)
  const alertProgressRef = useRef<{
    id: string | null
    startTimeLeftMs: number
  }>({
    id: null as string | null,
    startTimeLeftMs: DIFFICULTY.totalTimeMs,
  })
  const currentAlertId = state.game.currentAlert?.id ?? null
  const isMemoOpen = Boolean(state.game.activeMemo)
  // 수신 팝업과 통화는 판정을 막는다. 나중으로 내린 전화는 막지 않는다(14.6).
  const isPhoneUp = isPhoneBlocking(state.game)
  const isAlertFrozen = isMemoOpen || isPhoneUp
  const elapsedMs = DIFFICULTY.totalTimeMs - state.game.timeLeftMs
  // 메모가 떠 있는 동안 흘러간 시간. 경보 제한 시간에서 빼야 눈금과
  // 실제 만료 시각이 어긋나지 않는다. useGameLoop의 동결과 같은 규칙이다.
  const alertFrozenMsRef = useRef(0)
  const shellRef = useRef<HTMLElement>(null)
  const isAlertFrozenRef = useRef(isAlertFrozen)
  isAlertFrozenRef.current = isAlertFrozen
  muteRef.current = saved.mute
  volumeRef.current = saved.volumeStep

  if (alertProgressRef.current.id !== currentAlertId) {
    alertProgressRef.current = {
      id: currentAlertId,
      startTimeLeftMs: state.game.timeLeftMs,
    }
    alertFrozenMsRef.current = 0
  }

  const alertTimeRemainingRatio = currentAlertId === null
    ? 0
    : 1 -
      (alertProgressRef.current.startTimeLeftMs -
        state.game.timeLeftMs -
        alertFrozenMsRef.current) /
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
        isPhoneUp ||
        resolvedRef.current === currentAlertId
      ) {
        return
      }

      lastExplanationRef.current = state.game.currentAlert?.explanation ?? ''
      lastDecisiveFactRef.current = state.game.currentAlert?.decisiveFact ?? ''
      resolvedRef.current = currentAlertId
      dispatch({ type: 'DECIDE', action })
    },
    [currentAlertId, isMemoOpen, isPhoneUp, state.game.phase],
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
    if (isAlertFrozenRef.current) {
      alertFrozenMsRef.current += deltaMs
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

  const updateSaved = useCallback((update: Partial<Pick<Saved, 'mute' | 'volumeStep' | 'reduceMotion'>>) => {
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

  // 눈금 하나를 고른다. 단계 수와 실제 음량은 storage·audio가 정하고
  // 여기는 고른 값을 저장하는 일만 한다.
  const handleSetVolume = useCallback((level: Saved['volumeStep']) => {
    updateSaved({ volumeStep: level })
  }, [updateSaved])

  const handleDismissMemo = useCallback(() => {
    dispatch({ type: 'DISMISS_MEMO' })
  }, [])

  /** `↑` 받기. 수신 팝업에서도 나중으로 내린 뒤에도 받을 수 있다(14.6). */
  const handlePhoneUp = useCallback(() => {
    dispatch({ type: 'ANSWER_PHONE' })
  }, [])

  /** `↓` 수신이면 나중에, 통화 중이면 종료. 내려둔 상태에서는 아무 일도 없다. */
  const handlePhoneDown = useCallback(() => {
    dispatch(
      state.game.phone?.status === 'CONNECTED'
        ? { type: 'HANGUP_PHONE' }
        : { type: 'DEFER_PHONE' },
    )
  }, [state.game.phone?.status])

  /**
   * 벨이 다 가면 라이프 -1. 통화로 넘어갔으면 보지 않는다.
   *
   * 경과 시간으로 재므로 일시정지에서 벨이 멈추는 것이 공짜로 따라온다.
   */
  useEffect(() => {
    const phone = state.game.phone

    if (
      state.game.phase !== 'PLAYING' ||
      !phone ||
      phone.status === 'CONNECTED'
    ) {
      return
    }

    if (isRingExpired(phone.ringStartedAtMs, elapsedMs)) {
      dispatch({ type: 'MISS_PHONE' })
    }
  }, [elapsedMs, state.game.phase, state.game.phone])

  const keyboardHandlers = useMemo(
    () => ({
      onAllow: handleAllow,
      onBlock: handleBlock,
      onPauseToggle: handlePauseToggle,
      // 메모가 떠 있을 때만 넘긴다. 항상 넘기면 SPACE가 늘 가로채여
      // 포커스된 버튼이 SPACE로 눌리지 않는다.
      onDismissMemo: isMemoOpen ? handleDismissMemo : undefined,
      // 전화가 없으면 방향키에 손대지 않는다. 일시정지·결과 화면의 방향키
      // 조작과 부딪히면 안 된다.
      onPhoneUp: state.game.phone ? handlePhoneUp : undefined,
      onPhoneDown: state.game.phone ? handlePhoneDown : undefined,
    }),
    [
      handleAllow,
      handleBlock,
      handlePauseToggle,
      handleDismissMemo,
      handlePhoneUp,
      handlePhoneDown,
      isMemoOpen,
      state.game.phone,
    ],
  )

  useGameLoop({
    isRunning: state.game.phase === 'PLAYING',
    currentAlertId,
    isAlertClockFrozen: isAlertFrozen,
    onTick: handleTick,
    onTimeout: handleTimeout,
  })
  useKeyboard(
    state.game.phase === 'PLAYING' || state.game.phase === 'PAUSED',
    keyboardHandlers,
  )
  // 판이 멈춘 화면에서는 방향키로 버튼을 고른다. 근무 중에는 켜면 안 된다.
  // 그때 좌우는 ALLOW·BLOCK이다.
  const isSettled =
    state.game.phase === 'PAUSED' ||
    state.game.phase === 'SUCCESS' ||
    state.game.phase === 'FAILURE'
  useMenuKeys(isSettled, shellRef)

  // 들어오는 순간 첫 버튼을 잡는다. 잡아주지 않으면 방향키를 눌러도 시작점이
  // 없어 한 번은 헛돈다. 로비가 START SHIFT를 잡는 것과 같은 규칙이다.
  useEffect(() => {
    if (!isSettled) return
    shellRef.current?.querySelector<HTMLButtonElement>('.primary-button')?.focus()
  }, [isSettled])
  useVisibilityPause(
    state.game.phase === 'PLAYING',
    handleVisibilityPause,
  )

  return (
    <main
      ref={shellRef}
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
          volume={saved.volumeStep}
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
            {/* 수신과 통화만 카드를 덮는다. 나중으로 내리면 구석에 울리는
                중임만 남기고 경보는 정상으로 판정할 수 있다(14.3). */}
            {state.game.phone && state.game.phone.status !== 'DEFERRED' ? (
              state.game.phone.status === 'CONNECTED' ? (
                <PhoneOverlay
                  mode="connected"
                  caller={state.game.phone.call.caller}
                  message={state.game.phone.call.message}
                  onHangUp={handlePhoneDown}
                />
              ) : (
                <PhoneOverlay
                  mode="ringing"
                  caller={state.game.phone.call.caller}
                  message={state.game.phone.call.message}
                  ringProgress={ringProgress(
                    state.game.phone.ringStartedAtMs,
                    elapsedMs,
                  )}
                  onAnswer={handlePhoneUp}
                  onLater={handlePhoneDown}
                />
              )
            ) : null}
            {state.game.phone?.status === 'DEFERRED' ? (
              <p className="phone-deferred" aria-live="polite">
                <span className="phone-deferred-dot" aria-hidden="true" />
                울리는 중 · <kbd>↑</kbd> 받기
                <span className="phone-deferred-track" aria-hidden="true">
                  <span
                    style={{
                      transform: `scaleX(${ringProgress(
                        state.game.phone.ringStartedAtMs,
                        elapsedMs,
                      )})`,
                    }}
                  />
                </span>
              </p>
            ) : null}
          </div>
          {/* 버튼은 사라지지 않고 자리를 지킨다. 메모 중에는 판정이 막히므로
              비활성으로 둔다. 눌리지 않는 이유가 화면에 드러나야 한다. */}
          <ActionButtons
            disabled={state.game.currentAlert === null || isAlertFrozen}
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
