import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

import { DIFFICULTY } from '../../game/config'
import { ALERTS } from '../../game/data/alerts'
import { PIXEL_ART } from '../../game/data/pixelArt'
import type { Alert } from '../../game/types'
import { formatScore, formatSeconds } from '../../utils/format'
import PixelIcon from '../PixelIcon'

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

// 라이브 리전은 내용보다 먼저 DOM에 있어야 읽힌다. 화면마다 새로 만들면
// 리전과 내용이 같은 순간에 생겨 대부분의 스크린리더가 아무것도 읽지 않는다.
const PHASE_STATUS: Record<LobbyPhase, string> = {
  BOOT: '시스템 부팅 중',
  INITIALIZING: 'SOC 시스템 초기화 중',
  TITLE: 'SOC SHIFT:30, 30초의 관제 근무',
  READY: '콘솔 준비 완료, 로비를 여는 중',
  LOBBY: '야간 근무 로비',
}

const CONTROL_HINTS = [
  { keys: 'A / ←', action: 'ALLOW' },
  { keys: 'D / →', action: 'BLOCK' },
  { keys: 'P / ESC', action: 'PAUSE' },
]

const EXAMPLE_ALERT_IDS = ['https-normal', 'ssh-brute'] as const

const EXAMPLE_ALERTS = EXAMPLE_ALERT_IDS.map((id) => {
  const alert = ALERTS.find((item) => item.id === id)
  if (!alert) throw new Error(`Missing lobby example alert: ${id}`)
  return alert
})

function LobbyExample({ alert }: { alert: Alert }) {
  return (
    <article className="ready-example">
      <strong className="ready-example-head">{alert.title}</strong>
      <dl className="ready-example-facts">
        {alert.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>
              {fact.signal === 'suspicious' ? (
                <>
                  <PixelIcon grid={PIXEL_ART.suspiciousMarker} className="suspicious-marker" />
                  <span className="sr-only">수상한 항목: </span>
                </>
              ) : null}
              <span>{fact.value}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="ready-example-verdict">
        {alert.decisiveFact} → <strong>{alert.correctAction}</strong>
      </p>
    </article>
  )
}

export function LobbyExampleCards() {
  return (
    <>
      <p className="ready-examples-hint">
        표시는 <strong>수상한 항목에만</strong> 붙습니다.
        개수가 아니라 어떤 항목인지가 판정을 가릅니다.
      </p>
      <div className="ready-example-grid">
        {EXAMPLE_ALERTS.map((alert) => <LobbyExample alert={alert} key={alert.id} />)}
      </div>
    </>
  )
}

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
  const startButtonRef = useRef<HTMLButtonElement>(null)
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

  useEffect(() => {
    if (phase === 'LOBBY' && panel === 'MENU') startButtonRef.current?.focus()
  }, [panel, phase])

  return (
    <section className="lobby-scene" aria-label="SOC SHIFT:30 analyst desk"
      data-lobby-phase={phase} onClick={introActive ? completeIntro : undefined}>
      <img className="lobby-office" src={`${import.meta.env.BASE_URL}lobby-office-blank.webp`}
        alt="80년대 야간 사무실의 CRT 관제 컴퓨터와 커피, 서류가 놓인 책상" />
      <div className="crt-display">
        <p className="sr-only lobby-live-status" aria-live="polite">{PHASE_STATUS[phase]}</p>
        {phase === 'BOOT' ? <span className="crt-cursor" aria-hidden="true">_</span> : null}
        {phase === 'INITIALIZING' ? (
          <div className="boot-log" aria-hidden="true">
            <strong>SOC/SHIFT OS v3.0</strong>
            {BOOT_LOGS.map((line, index) => (
              <span key={line} style={{ '--log-index': index } as CSSProperties}>{line}</span>
            ))}
          </div>
        ) : null}
        {phase === 'TITLE' ? (
          <div className="intro-title" aria-hidden="true"><span>ALEPH SECURITY LAB</span>
            <strong>SOC SHIFT:30</strong><small>30 SECONDS ON THE FRONT LINE</small></div>
        ) : null}
        {phase === 'READY' ? (
          <div className="intro-ready" aria-hidden="true"><span>NETWORK STATUS // ONLINE</span>
            <strong>ANALYST CONSOLE READY</strong><small>OPENING NIGHT SHIFT LOBBY…</small></div>
        ) : null}
        {phase === 'LOBBY' ? (
          <div className="lobby-console">
            <header className="lobby-console-header"><span>SOC NODE // 01</span>
              <span className="status-online">● ONLINE</span></header>
            {panel === 'MENU' ? (
              <div className="lobby-menu">
                <div className="lobby-title"><span>ALEPH SECURITY LAB</span>
                  <h2>SOC SHIFT:30</h2><p>DETECT. DECIDE. DEFEND.</p></div>
                <div className="lobby-actions">
                  <button ref={startButtonRef} className="lobby-start" type="button" onClick={onStart}>START SHIFT</button>
                  <button type="button" onClick={() => setPanel('HOW_TO_PLAY')}>HOW TO PLAY</button>
                  <button type="button" onClick={() => setPanel('SHIFT_RECORD')}>SHIFT RECORD</button>
                </div>
                <ul className="lobby-controls">
                  {CONTROL_HINTS.map(({ keys, action }) => (
                    <li key={action}><kbd>{keys}</kbd> {action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {panel === 'HOW_TO_PLAY' ? (
              <div className="lobby-panel" aria-label="HOW TO PLAY"><h2>HOW TO PLAY</h2>
                <LobbyExampleCards />
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
