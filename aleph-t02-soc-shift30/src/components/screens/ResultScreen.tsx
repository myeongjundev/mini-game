import { DIFFICULTY } from '../../game/config'
import type { GameState } from '../../game/types'
import { formatAccuracy, formatScore, formatSeconds } from '../../utils/format'
import ShiftLog from '../ShiftLog'

export type ResultScreenProps = {
  state: GameState
  bestScore: number
  onRestart: () => void
}

export default function ResultScreen({ state, bestScore, onRestart }: ResultScreenProps) {
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
    ['BEST SCORE', formatScore(bestScore)],
    ['SURVIVAL TIME', formatSeconds(DIFFICULTY.totalTimeMs - state.timeLeftMs)],
  ]

  return (
    <section className={`screen result-screen result-${state.phase.toLowerCase()}`} aria-labelledby="result-title">
      <p className="screen-kicker">SHIFT REPORT</p>
      <h2 id="result-title">{state.phase === 'SUCCESS' ? 'SHIFT COMPLETE' : 'SECURITY LOST'}</h2>
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
      <ShiftLog log={state.log} />
      <button className="primary-button" type="button" onClick={onRestart}>RETURN TO READY</button>
    </section>
  )
}
