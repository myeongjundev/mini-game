import { DIFFICULTY } from '../../game/config'
import { formatScore, formatSeconds } from '../../utils/format'

export type ReadyScreenProps = {
  bestScore: number
  onStart: () => void
}

export default function ReadyScreen({ bestScore, onStart }: ReadyScreenProps) {
  return (
    <section className="screen ready-screen" aria-labelledby="ready-title">
      <p className="screen-kicker">NIGHT SHIFT / CONSOLE READY</p>
      <h2 id="ready-title">30초 동안 관제선을 지키세요.</h2>
      <p className="screen-summary">
        정상 활동은 ALLOW, 위협은 BLOCK으로 판정하고 보안 라이프를 지키세요.
      </p>
      <div className="ready-grid">
        <div>
          <span className="section-label">CONTROLS</span>
          <p><kbd>A / ←</kbd> ALLOW</p>
          <p><kbd>D / →</kbd> BLOCK</p>
          <p><kbd>P / ESC</kbd> PAUSE</p>
        </div>
        <div>
          <span className="section-label">SHIFT</span>
          <p>{formatSeconds(DIFFICULTY.totalTimeMs)} LIMIT</p>
          <p>{DIFFICULTY.lives} SECURITY LIVES</p>
          <p>BEST {formatScore(bestScore)}</p>
        </div>
      </div>
      <div className="failure-legend">
        <p><strong>FALSE POSITIVE</strong> 정상 활동을 막아 가용성을 잃습니다.</p>
        <p><strong>MISSED THREAT</strong> 위협을 허용해 침해를 놓칩니다.</p>
      </div>
      <button className="primary-button" type="button" onClick={onStart}>
        START SHIFT
      </button>
    </section>
  )
}
