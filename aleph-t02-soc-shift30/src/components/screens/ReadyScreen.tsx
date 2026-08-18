import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

import { DIFFICULTY } from '../../game/config'
import { formatScore, formatSeconds } from '../../utils/format'

export type LobbyPhase = 'BOOT' | 'INITIALIZING' | 'TITLE' | 'READY' | 'LOBBY'
type LobbyPanel = 'MENU' | 'HOW_TO_PLAY' | 'SHIFT_RECORD'

const NEXT_PHASE: Partial<Record<LobbyPhase, LobbyPhase>> = {
  BOOT: 'INITIALIZING', INITIALIZING: 'TITLE', TITLE: 'READY', READY: 'LOBBY',
}
const PHASE_TIME_MS: Record<LobbyPhase, number> = {
  BOOT: 400, INITIALIZING: 1_300, TITLE: 850, READY: 550, LOBBY: 0,
}
const REDUCED_PHASE_TIME_MS: Record<LobbyPhase, number> = {
  BOOT: 80, INITIALIZING: 200, TITLE: 180, READY: 120, LOBBY: 0,
}
const BOOT_LOGS = [
  'LINKING SOC NODE 01 ........ OK',
  'SYNCING INCIDENT FEED ...... OK',
  'VERIFYING ANALYST PROFILE .. OK',
  'LOADING SHIFT PROTOCOL ..... OK',
]

export type ReadyScreenProps = {
  bestScore: number
  mute: boolean
  reduceMotion: boolean
  playIntro: boolean
  onIntroComplete: () => void
  onStart: () => void
  onToggleMute: () => void
  onToggleReduceMotion: () => void
}

export default function ReadyScreen({ bestScore, mute, reduceMotion, playIntro,
  onIntroComplete, onStart, onToggleMute, onToggleReduceMotion }: ReadyScreenProps) {
  const [phase, setPhase] = useState<LobbyPhase>(playIntro ? 'BOOT' : 'LOBBY')
  const [panel, setPanel] = useState<LobbyPanel>('MENU')
  const completedRef = useRef(!playIntro)
  const introActive = phase !== 'LOBBY'

  const completeIntro = useCallback(() => {
    setPhase('LOBBY')
    if (!completedRef.current) {
      completedRef.current = true
      onIntroComplete()
    }
  }, [onIntroComplete])

  useEffect(() => {
    if (!introActive) return
    const durations = reduceMotion ? REDUCED_PHASE_TIME_MS : PHASE_TIME_MS
    const timeoutId = window.setTimeout(() => {
      const nextPhase = NEXT_PHASE[phase]
      if (nextPhase === 'LOBBY') completeIntro()
      else if (nextPhase) setPhase(nextPhase)
    }, durations[phase])
    return () => window.clearTimeout(timeoutId)
  }, [completeIntro, introActive, phase, reduceMotion])

  useEffect(() => {
    if (!introActive) return
    const handleSkipKey = (event: KeyboardEvent) => {
      if (!event.repeat && (event.key === 'Enter' || event.key === ' ' ||
        event.code === 'Enter' || event.code === 'Space')) {
        event.preventDefault()
        completeIntro()
      }
    }
    window.addEventListener('keydown', handleSkipKey)
    return () => window.removeEventListener('keydown', handleSkipKey)
  }, [completeIntro, introActive])

  return (
    <section className="lobby-scene" aria-label="SOC SHIFT:30 analyst desk"
      data-lobby-phase={phase} onClick={introActive ? completeIntro : undefined}>
      <img className="lobby-office" src={`${import.meta.env.BASE_URL}lobby-office.png`}
        alt="80년대 야간 사무실의 CRT 관제 컴퓨터와 커피, 서류가 놓인 책상" />
      <div className="crt-display" aria-live="polite">
        {phase === 'BOOT' ? <span className="crt-cursor" aria-label="시스템 부팅 중">_</span> : null}
        {phase === 'INITIALIZING' ? (
          <div className="boot-log" aria-label="SOC 시스템 초기화 중">
            <strong>SOC/SHIFT OS v3.0</strong>
            {BOOT_LOGS.map((line, index) => (
              <span key={line} style={{ '--log-index': index } as CSSProperties}>{line}</span>
            ))}
          </div>
        ) : null}
        {phase === 'TITLE' ? (
          <div className="intro-title"><span>ALEPH SECURITY LAB</span>
            <strong>SOC SHIFT:30</strong><small>30 SECONDS ON THE FRONT LINE</small></div>
        ) : null}
        {phase === 'READY' ? (
          <div className="intro-ready"><span>NETWORK STATUS // ONLINE</span>
            <strong>ANALYST CONSOLE READY</strong><small>OPENING NIGHT SHIFT LOBBY…</small></div>
        ) : null}
        {phase === 'LOBBY' ? (
          <div className="lobby-console">
            <header className="lobby-console-header"><span>SOC NODE // 01</span>
              <span className="status-online">● ONLINE</span></header>
            {panel === 'MENU' ? (<>
              <div className="lobby-title"><span>ALEPH SECURITY LAB</span>
                <h2>SOC SHIFT:30</h2><p>DETECT. DECIDE. DEFEND.</p></div>
              <div className="lobby-actions">
                <button className="lobby-start" type="button" onClick={onStart}>START SHIFT</button>
                <button type="button" onClick={() => setPanel('HOW_TO_PLAY')}>HOW TO PLAY</button>
                <button type="button" onClick={() => setPanel('SHIFT_RECORD')}>SHIFT RECORD</button>
              </div>
              <div className="lobby-status-grid"><span>INCIDENT FEED <strong>ACTIVE</strong></span>
                <span>ANALYST STATUS <strong>READY</strong></span></div>
            </>) : null}
            {panel === 'HOW_TO_PLAY' ? (
              <div className="lobby-panel"><h2>HOW TO PLAY</h2>
                <p>수상한 표시가 붙은 사실을 확인하고 30초 동안 경보를 판정하세요.</p>
                <p><kbd>A / ←</kbd> ALLOW · <kbd>D / →</kbd> BLOCK</p>
                <p><kbd>P / ESC</kbd> PAUSE · SECURITY ×{DIFFICULTY.lives}</p>
                <button type="button" onClick={() => setPanel('MENU')}>← BACK</button></div>
            ) : null}
            {panel === 'SHIFT_RECORD' ? (
              <div className="lobby-panel"><h2>SHIFT RECORD</h2><span>LOCAL BEST</span>
                <strong className="lobby-best">{formatScore(bestScore)}</strong>
                <p>SHIFT LIMIT // {formatSeconds(DIFFICULTY.totalTimeMs)}</p>
                <button type="button" onClick={() => setPanel('MENU')}>← BACK</button></div>
            ) : null}
            <footer className="lobby-console-footer">
              <button type="button" onClick={onToggleMute}>SOUND // {mute ? 'OFF' : 'ON'}</button>
              <button type="button" onClick={onToggleReduceMotion}>REDUCE MOTION // {reduceMotion ? 'ON' : 'OFF'}</button>
              <span>SHIFT READY</span>
            </footer>
          </div>
        ) : <span className="intro-skip">ENTER / SPACE / CLICK TO SKIP</span>}
      </div>
    </section>
  )
}
