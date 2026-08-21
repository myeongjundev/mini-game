import { DIFFICULTY } from '../../game/config'
import type { GameState } from '../../game/types'
import { formatAccuracy, formatScore, formatSeconds } from '../../utils/format'
import HandoverReport from '../HandoverReport'
import MemoLog from '../MemoLog'
import ShiftLog from '../ShiftLog'

export type ResultScreenProps = {
  state: GameState
  bestScore: number
  /** 로비로 돌아간다. */
  onRestart: () => void
  /** 로비를 거치지 않고 새 판을 바로 시작한다. */
  onRetry: () => void
}

export default function ResultScreen({ state, bestScore, onRestart, onRetry }: ResultScreenProps) {
  const correct = state.threatsBlocked + state.normalAllowed
  const failures = state.falsePositives + state.missedThreats
  const falsePositiveRatio = failures === 0 ? 0 : state.falsePositives / failures
  const missedThreatRatio = failures === 0 ? 0 : state.missedThreats / failures
  const rows = [
    ['RESULT', state.phase],
    ['SCORE', formatScore(state.score)],
    ['ALERTS REVIEWED', String(state.reviewed)],
    ['THREATS BLOCKED', String(state.threatsBlocked)],
    ['NORMAL ALLOWED', String(state.normalAllowed)],
    ['FALSE POSITIVES', String(state.falsePositives)],
    ['MISSED THREATS', String(state.missedThreats)],
    ['NO DECISIONS', String(state.timeouts)],
    ['ACCURACY', formatAccuracy(correct, state.reviewed)],
    ['MAX COMBO', `×${state.maxCombo}`],
    // 한 장도 뜨지 않은 판에서 "0 / 0"은 읽는 사람을 헷갈리게 한다.
    ...(state.memosShown > 0
      ? [['MEMOS READ', `${state.memosRead} / ${state.memosShown}`]]
      : []),
    // 놓친 전화도 라이프를 깎는다. 적지 않으면 왜 잃었는지 알 수 없다.
    ...(state.phoneMissed > 0 ? [['CALL MISSED', String(state.phoneMissed)]] : []),
    ['BEST SCORE', formatScore(bestScore)],
    ['SURVIVAL TIME', formatSeconds(DIFFICULTY.totalTimeMs - state.timeLeftMs)],
  ]

  return (
    <section className={`screen result-screen result-${state.phase.toLowerCase()}`} aria-labelledby="result-title">
      <p className="screen-kicker">SHIFT REPORT</p>
      <h2 id="result-title">{state.phase === 'SUCCESS' ? 'SHIFT COMPLETE' : 'SECURITY LOST'}</h2>
      <HandoverReport state={state} />
      <dl className="result-grid">
        {rows.map(([label, value]) => (
          <div className="result-row" key={label}>
            <dt>{label}</dt>
            <dd data-numeric>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="error-bars" aria-label="오판 유형 비교">
        <div className="error-bar-row">
          <span>FALSE POSITIVE</span>
          <div className="error-track"><span className="error-value error-false-positive" style={{ width: `${falsePositiveRatio * 100}%` }} /></div>
          <strong>{state.falsePositives}</strong>
        </div>
        <div className="error-bar-row">
          <span>MISSED THREAT</span>
          <div className="error-track"><span className="error-value error-missed-threat" style={{ width: `${missedThreatRatio * 100}%` }} /></div>
          <strong>{state.missedThreats}</strong>
        </div>
      </div>
      <ShiftLog log={state.log} memos={state.memoLog} call={state.phoneLog} />
      <MemoLog
        memos={state.memoLog}
        seenAlertIds={state.log.map((entry) => entry.alertId)}
      />
      {/* 한 판이 30초다. 다시 하려고 로비를 거쳐 START SHIFT를 또 누르는 것은
          그 자체가 마찰이다. 재도전을 기본 버튼으로 두어 엔터로 바로 이어지게
          하고, 로비로 가는 길은 옆에 남긴다. */}
      <div className="screen-actions">
        <button className="primary-button" type="button" onClick={onRetry}>RETRY SHIFT</button>
        <button className="secondary-button" type="button" onClick={onRestart}>RETURN TO READY</button>
      </div>
    </section>
  )
}
