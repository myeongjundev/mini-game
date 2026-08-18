import { DIFFICULTY } from '../../game/config'
import { ALERTS } from '../../game/data/alerts'
import { PIXEL_ART } from '../../game/data/pixelArt'
import type { Alert } from '../../game/types'
import { formatScore, formatSeconds } from '../../utils/format'
import PixelIcon from '../PixelIcon'

const EXAMPLES: { alert: Alert; verdict: string; reason: string }[] = [
  {
    alert: ALERTS.find((item) => item.id === 'https-normal')!,
    verdict: 'ALLOW',
    reason: '표시가 하나도 없습니다. 통과시킵니다.',
  },
  {
    alert: ALERTS.find((item) => item.id === 'ssh-brute')!,
    verdict: 'BLOCK',
    reason: '표시가 세 개입니다. 차단합니다.',
  },
]

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
      <div className="ready-examples">
        <span className="section-label">이렇게 판단하세요</span>
        <p className="ready-examples-hint">
          경보의 사실 네 줄 중 <strong>수상한 항목에만 표시</strong>가 붙습니다.
          표시 개수만으로 정해지지는 않으니 어떤 항목인지 보세요.
        </p>
        <div className="ready-example-grid">
          {EXAMPLES.map(({ alert, verdict, reason }) => (
            <div className="ready-example" key={alert.id}>
              <div className="ready-example-head">
                <PixelIcon
                  grid={PIXEL_ART[alert.category]}
                  title={`${alert.category} 카테고리`}
                  className="category-icon"
                />
                <span>{alert.title}</span>
              </div>
              <dl className="ready-example-facts">
                {alert.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd
                      className={
                        fact.signal === 'suspicious'
                          ? 'fact-suspicious'
                          : undefined
                      }
                    >
                      {fact.signal === 'suspicious' ? (
                        <>
                          <PixelIcon
                            grid={PIXEL_ART.suspiciousMarker}
                            title="수상한 항목"
                            className="suspicious-marker"
                          />
                          <span className="sr-only">수상한 항목: </span>
                        </>
                      ) : null}
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="ready-example-verdict">
                <strong>{verdict}</strong> {reason}
              </p>
            </div>
          ))}
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
