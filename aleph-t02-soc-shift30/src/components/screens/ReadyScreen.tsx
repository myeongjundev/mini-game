import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'

import { DIFFICULTY, MEMO } from '../../game/config'
import { ALERTS } from '../../game/data/alerts'
import { MEMOS } from '../../game/data/memos'
import { PIXEL_ART } from '../../game/data/pixelArt'
import type { Alert } from '../../game/types'
import type { VolumeLevel } from '../../services/storage'
import { formatScore, formatSeconds } from '../../utils/format'
import { useMenuKeys } from '../../game/hooks/useMenuKeys'
import LobbyModal from '../LobbyModal'
import PixelIcon from '../PixelIcon'

export type LobbyPhase = 'BOOT' | 'INITIALIZING' | 'TITLE' | 'READY' | 'LOBBY'
// HOW TO PLAY는 패널 교체가 아니라 모달이 됐다. SHIFT_RECORD는 그대로 패널이다.
type LobbyPanel = 'MENU' | 'SHIFT_RECORD'
type LobbyModalType = 'GUIDE' | 'SETTINGS' | null

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

function findAlert(id: string): Alert {
  const alert = ALERTS.find((item) => item.id === id)
  if (!alert) throw new Error(`Missing lobby alert: ${id}`)
  return alert
}

const EXAMPLE_ALERTS = ['https-normal', 'ssh-brute'].map(findAlert)

// 거의 같은 카드인데 목적지 한 줄에서 갈린다. 표시가 붙었으니 위험하다는
// 오해를 깨는 데 이 한 쌍이 설명 열 줄보다 낫다.
const COMPARE_ALERTS = ['exfil', 'backup-job'].map(findAlert)

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
      <p className="ready-example-why">{alert.explanation}</p>
    </article>
  )
}

function CompareRow({ alert }: { alert: Alert }) {
  const decisive = alert.facts.find((fact) => fact.label === alert.decisiveFact)

  return (
    <article className="guide-compare-row" data-action={alert.correctAction}>
      <strong>{alert.title}</strong>
      <p className="guide-compare-fact">
        <span className="guide-compare-label">{alert.decisiveFact}</span>
        <span>{decisive?.value}</span>
      </p>
      <span className="guide-compare-verdict">{alert.correctAction}</span>
    </article>
  )
}

export const GUIDE_PAGE_COUNT = 6

// 가이드에 쓰는 예시 공지. 하드코딩하지 않고 실제 데이터에서 읽는다.
// 데이터가 바뀌면 가이드도 함께 바뀌어야 한다. 경보 예시와 같은 규칙이다.
const EXAMPLE_MEMO = MEMOS[0]

export function LobbyGuidePage({ page }: { page: number }) {
  if (page === 0) {
    return (
      <>
        <p className="guide-lead">
          들어오는 보안 경보를 <strong>ALLOW</strong>(통과) 또는{' '}
          <strong>BLOCK</strong>(차단)으로 판정합니다.
        </p>
        <ul className="guide-list">
          <li>근무 시간 {formatSeconds(DIFFICULTY.totalTimeMs)}, 보안 라이프 {DIFFICULTY.lives}개</li>
          <li>경보 하나를 넘길 때까지 {formatSeconds(DIFFICULTY.eventIntervalMs)}</li>
          <li>판정하지 않고 넘기면 라이프가 줄어듭니다. <strong>가만히 있으면 집니다</strong></li>
        </ul>
        <ul className="lobby-controls guide-controls">
          {CONTROL_HINTS.map(({ keys, action }) => (
            <li key={action}><kbd>{keys}</kbd> {action}</li>
          ))}
        </ul>
      </>
    )
  }

  // 공지는 근무 3초부터 뜬다. 판단 교재보다 앞에 둬야 처음 보는 사람이
  // 놀라지 않는다. 규칙은 GAME_SPEC 13절이다.
  if (page === 1) {
    return (
      <>
        <p className="guide-lead">
          근무 중 사내 공지가 <strong>{MEMO.perShift}번</strong> 올라옵니다.
          뒤에 올 경보의 <strong>판단 근거</strong>를 줍니다.
        </p>
        <article className="guide-memo">
          <p className="guide-memo-head">
            <PixelIcon grid={PIXEL_ART.memo} className="guide-memo-icon" />
            <span>{EXAMPLE_MEMO.from}</span>
            <time>{EXAMPLE_MEMO.time}</time>
          </p>
          <p className="guide-memo-body">{EXAMPLE_MEMO.body}</p>
        </article>
        <ul className="guide-list">
          <li>떠 있는 동안 판정이 막히지만 <strong>경보 제한시간도 함께 멈춥니다</strong>. 손해가 없습니다</li>
          <li>다만 <strong>30초 근무 시계는 계속 흐릅니다</strong>. 오래 열어두면 처리할 경보가 줄어듭니다</li>
          <li><kbd>SPACE</kbd> 또는 클릭으로 닫습니다</li>
          <li>닫아도 <strong>기록에 남아</strong> 근무 내내 다시 볼 수 있습니다</li>
        </ul>
      </>
    )
  }

  if (page === 2) {
    return (
      <>
        <p className="guide-lead">표시는 <strong>수상한 항목에만</strong> 붙습니다.</p>
        <LobbyExample alert={EXAMPLE_ALERTS[0]} />
      </>
    )
  }

  if (page === 3) {
    return (
      <>
        <p className="guide-lead"><strong>사람이 할 수 없는 수준</strong>이면 자동화입니다.</p>
        <LobbyExample alert={EXAMPLE_ALERTS[1]} />
      </>
    )
  }

  if (page === 4) {
    return (
      <>
        <p className="guide-lead">
          둘 다 새벽에 몇 GB를 내보냅니다. 표시도 둘 다 붙어 있습니다.
          <strong> 목적지 한 줄이 갈랐습니다.</strong>
        </p>
        <div className="guide-compare">
          {COMPARE_ALERTS.map((alert) => <CompareRow alert={alert} key={alert.id} />)}
        </div>
      </>
    )
  }

  return (
    <>
      <p className="guide-lead">한 일보다 <strong>그럴 자격이 있는지</strong>를 보세요.</p>
      <ul className="guide-list">
        <li>기기·계정·목적지가 <strong>등록된</strong> 것인가</li>
        <li>이상한 수치에 <strong>설명이 붙어</strong> 있는가 (정기 백업, 판촉 행사)</li>
        <li>인증을 통과해도 <strong>평소 하지 않던 일</strong>인가</li>
        <li>표시 개수가 아니라 <strong>어떤 항목인지</strong>를 보세요</li>
      </ul>
      <dl className="guide-failure">
        <div><dt>FALSE POSITIVE</dt><dd>정상을 막아 가용성을 잃습니다</dd></div>
        <div><dt>MISSED THREAT</dt><dd>위협을 통과시켜 침해를 놓칩니다</dd></div>
      </dl>
    </>
  )
}

// 검사가 쪽 번호를 박아두면 쪽을 하나 넣을 때마다 깨진다. 제목으로 찾게
// 내보낸다. 실제로 공지 쪽을 넣으면서 네 건이 깨졌다.
export const GUIDE_TITLES = [
  '근무 요령',
  '근무 중 공지',
  '통과시키는 경보',
  '막는 경보',
  '같아 보이지만 다른 것',
  '자주 갈리는 지점',
]

function LobbyGuideModal({ onClose, reduceMotion }: { onClose: () => void; reduceMotion: boolean }) {
  const [page, setPage] = useState(0)
  const last = GUIDE_PAGE_COUNT - 1

  return (
    <LobbyModal
      title="HOW TO PLAY"
      onClose={onClose}
      reduceMotion={reduceMotion}
      // 그림의 하단 버튼 자리는 둘이다. 마지막 쪽에서는 다음 쪽이 없으므로
      // 그 자리를 CLOSE로 바꿔 하단에서도 닫을 수 있게 한다.
      buttons={[
        {
          label: 'PREV',
          ariaLabel: '이전 쪽',
          disabled: page === 0,
          onClick: () => setPage((value) => Math.max(0, value - 1)),
        },
        page === last
          ? { label: 'CLOSE', ariaLabel: 'HOW TO PLAY 닫기', onClick: onClose }
          : {
              label: 'NEXT',
              ariaLabel: '다음 쪽',
              onClick: () => setPage((value) => Math.min(last, value + 1)),
            },
      ]}
    >
      <div className="lobby-guide-head">
        <h3>{GUIDE_TITLES[page]}</h3>
        <span aria-hidden="true">{page + 1} / {GUIDE_PAGE_COUNT}</span>
        <span className="sr-only">{GUIDE_PAGE_COUNT}쪽 중 {page + 1}쪽</span>
      </div>
      <div className="lobby-guide-body">
        <LobbyGuidePage page={page} />
      </div>
    </LobbyModal>
  )
}

const VOLUME_LABELS = ['LOW', 'MID', 'HIGH'] as const

function LobbySettingsModal({
  mute, volume, reduceMotion, onClose, onToggleMute, onSetVolume, onToggleReduceMotion,
}: {
  mute: boolean
  volume: VolumeLevel
  reduceMotion: boolean
  onClose: () => void
  onToggleMute: () => void
  onSetVolume: (level: VolumeLevel) => void
  onToggleReduceMotion: () => void
}) {
  // 저장 기본값은 `services/storage.ts`의 DEFAULTS다.
  // 소리 꺼짐, 크기 MID, 움직임 그대로.
  const atDefaults = mute && volume === 1 && !reduceMotion

  return (
    <LobbyModal
      title="SYSTEM SETTINGS"
      onClose={onClose}
      reduceMotion={reduceMotion}
      buttons={[
        {
          label: 'RESET',
          ariaLabel: '설정을 기본값으로 되돌리기',
          disabled: atDefaults,
          onClick: () => {
            if (!mute) onToggleMute()
            if (volume !== 1) onSetVolume(1)
            if (reduceMotion) onToggleReduceMotion()
          },
        },
        { label: 'CLOSE', ariaLabel: 'SYSTEM SETTINGS 닫기', onClick: onClose },
      ]}
    >
      {/* 누르는 즉시 반영한다. 저장 단계가 따로 없으므로 APPLY도 없다. */}
      <dl className="lobby-settings">
        <div className="lobby-settings-row">
          <dt id="setting-sound">SOUND</dt>
          <dd>
            <button type="button" onClick={onToggleMute} aria-describedby="setting-sound"
              aria-pressed={!mute}>
              // {mute ? 'OFF' : 'ON'}
            </button>
          </dd>
        </div>
        {/* 소리를 끈 상태에서는 크기를 고를 이유가 없다. 자리는 지키되
            비활성으로 둔다. 사라지면 "어디 갔지"가 된다. */}
        <div className="lobby-settings-row">
          <dt id="setting-volume">VOLUME</dt>
          <dd>
            <button type="button" disabled={mute} aria-describedby="setting-volume"
              onClick={() => onSetVolume(((volume + 1) % 3) as VolumeLevel)}>
              // {VOLUME_LABELS[volume]}
            </button>
          </dd>
        </div>
        <div className="lobby-settings-row">
          <dt id="setting-motion">REDUCE MOTION</dt>
          <dd>
            <button type="button" onClick={onToggleReduceMotion} aria-describedby="setting-motion"
              aria-pressed={reduceMotion}>
              // {reduceMotion ? 'ON' : 'OFF'}
            </button>
          </dd>
        </div>
      </dl>
      <p className="lobby-settings-note">바꾸면 바로 적용됩니다. 이 기기에 저장됩니다.</p>
    </LobbyModal>
  )
}

export type ReadyScreenProps = {
  bestScore: number
  mute: boolean
  volume: VolumeLevel
  reduceMotion: boolean
  playIntro: boolean
  onIntroComplete: () => void
  onStart: () => void
  onToggleMute: () => void
  onSetVolume: (level: VolumeLevel) => void
  onToggleReduceMotion: () => void
}

export default function ReadyScreen({ bestScore, mute, volume, reduceMotion, playIntro,
  onIntroComplete, onStart, onToggleMute, onSetVolume, onToggleReduceMotion }: ReadyScreenProps) {
  const [phase, setPhase] = useState<LobbyPhase>(playIntro ? 'BOOT' : 'LOBBY')
  const [panel, setPanel] = useState<LobbyPanel>('MENU')
  const [activeModal, setActiveModal] = useState<LobbyModalType>(null)
  const completedRef = useRef(!playIntro)
  const startButtonRef = useRef<HTMLButtonElement>(null)
  const lobbyFocusedRef = useRef(false)
  const consoleRef = useRef<HTMLDivElement>(null)
  // 모달을 연 버튼. 닫은 뒤 여기로 포커스를 돌려준다.
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null)
  const wasModalOpenRef = useRef(false)
  const introActive = phase !== 'LOBBY'
  const modalOpen = activeModal !== null
  const closeModal = useCallback(() => setActiveModal(null), [])

  const openModal = useCallback(
    (type: Exclude<LobbyModalType, null>) =>
      (event: React.MouseEvent<HTMLButtonElement>) => {
        modalTriggerRef.current = event.currentTarget
        setActiveModal(type)
      },
    [],
  )

  // 모달이 떠 있는 동안 뒤쪽 로비는 클릭·포커스·키보드를 받지 않는다.
  //
  // effect로 걸면 안 된다. 모달이 사라질 때 정리(포커스 복원)가 부모 effect보다
  // 먼저 돌아서, 아직 inert인 버튼에 포커스가 거부되고 body로 떨어진다.
  // 실제로 그렇게 났다. 렌더에서 걸면 커밋 시점에 속성이 먼저 사라진다.
  //
  // React 18 타입에는 inert가 없어서 속성으로 펼친다.
  const inertProps = (modalOpen ? { inert: '' } : {}) as Record<string, string>

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

  // 로비 메뉴에 처음 들어올 때만 START SHIFT를 잡는다. 모달을 닫을 때마다
  // 다시 잡으면 모달이 돌려준 포커스를 뺏어간다.
  useEffect(() => {
    if (phase !== 'LOBBY' || panel !== 'MENU') {
      lobbyFocusedRef.current = false
      return
    }
    if (lobbyFocusedRef.current) return
    lobbyFocusedRef.current = true
    startButtonRef.current?.focus()
  }, [panel, phase])

  // 로비 버튼을 방향키로 옮겨 다닌다. 모달이 떠 있으면 멈춘다.
  // 모달 안 포커스를 뒤쪽 로비로 끌고 가면 안 된다.
  useMenuKeys(phase === 'LOBBY' && !modalOpen, consoleRef)

  // 모달이 닫힌 뒤 연 버튼으로 포커스를 돌려준다. 이 effect는 inert를 지운
  // 커밋 다음에 돌기 때문에 포커스가 거부되지 않는다.
  useEffect(() => {
    if (wasModalOpenRef.current && !modalOpen) {
      const trigger = modalTriggerRef.current
      if (trigger?.isConnected) trigger.focus()
    }
    wasModalOpenRef.current = modalOpen
  }, [modalOpen])

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
          <>
            <div className="lobby-console" data-panel={panel} ref={consoleRef} {...inertProps}>
              <header className="lobby-console-header"><span>SOC NODE // 01</span>
                <span className="status-online">● ONLINE</span></header>
              {panel === 'MENU' ? (
                <div className="lobby-menu">
                  <div className="lobby-title"><span>ALEPH SECURITY LAB</span>
                    <h2>SOC SHIFT:30</h2><p>DETECT. DECIDE. DEFEND.</p></div>
                  <div className="lobby-actions">
                    <button ref={startButtonRef} className="lobby-start" type="button" onClick={onStart}>START SHIFT</button>
                    <button type="button" onClick={openModal('GUIDE')}>HOW TO PLAY</button>
                    <button type="button" onClick={openModal('SETTINGS')}>SETTINGS</button>
                    <button type="button" onClick={() => setPanel('SHIFT_RECORD')}>SHIFT RECORD</button>
                  </div>
                  <ul className="lobby-controls">
                    {/* 로비에서 쓰는 키를 먼저 알린다. 판정 키는 근무가
                        시작돼야 살아나므로 가이드 첫 쪽에서 다시 나온다. */}
                    <li><kbd>↑ ↓</kbd> 메뉴 이동</li>
                    <li><kbd>ENTER</kbd> 선택</li>
                    {CONTROL_HINTS.map(({ keys, action }) => (
                      <li key={action}><kbd>{keys}</kbd> {action}</li>
                    ))}
                  </ul>
                </div>
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
          </>
        ) : <span className="intro-skip">ENTER / SPACE / CLICK TO SKIP</span>}
      </div>

      {/* 모달은 CRT 유리 밖에 둔다. 유리 안에 넣으면 본문이 118px밖에 안 나와
          가이드가 계속 잘린다. 그림 속 모니터는 로비 화면의 무대이지 이
          대화상자의 경계가 아니다. */}
      {phase === 'LOBBY' && activeModal === 'GUIDE' ? (
        <LobbyGuideModal onClose={closeModal} reduceMotion={reduceMotion} />
      ) : null}
      {phase === 'LOBBY' && activeModal === 'SETTINGS' ? (
        <LobbySettingsModal
          mute={mute}
          volume={volume}
          reduceMotion={reduceMotion}
          onClose={closeModal}
          onToggleMute={onToggleMute}
          onSetVolume={onSetVolume}
          onToggleReduceMotion={onToggleReduceMotion}
        />
      ) : null}
    </section>
  )
}
