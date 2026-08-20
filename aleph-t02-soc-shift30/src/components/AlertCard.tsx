import { PIXEL_ART } from '../game/data/pixelArt'
import { PORTRAIT_BY_ALERT, portraitUrl } from '../game/data/portraits'
import type { Alert } from '../game/types'
import PixelIcon from './PixelIcon'

export type AlertCardProps = {
  alert: Alert
  timeRemainingRatio: number
}

export default function AlertCard({ alert, timeRemainingRatio }: AlertCardProps) {
  const progress = Math.min(1, Math.max(0, timeRemainingRatio))
  const portrait = PORTRAIT_BY_ALERT[alert.id]

  return (
    <article className="alert-card">
      <div className="alert-time-track" aria-hidden="true">
        <span
          className="alert-time-value"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <header className="alert-header">
        <PixelIcon
          grid={PIXEL_ART[alert.category]}
          title={`${alert.category} 카테고리`}
          className="category-icon"
        />
        <div>
          <span className="alert-meta">TIER {alert.tier}</span>
          <h2>{alert.title}</h2>
        </div>
        {/* 사건 당사자. 없는 경보가 더 많으므로 빈 자리를 만들지 않는다.
            판정 근거가 아니라서 읽어주지 않는다. 누구인지는 아래 사실 행의
            USER·ROLE이 글자로 말한다. */}
        {portrait === undefined ? null : (
          <img
            className="alert-portrait"
            src={portraitUrl(portrait)}
            alt=""
            aria-hidden="true"
            width={128}
            height={128}
          />
        )}
      </header>
      <p className="fact-signal-guide">수상한 항목에 표시가 붙습니다</p>
      <dl className="fact-grid">
        {alert.facts.map((fact) => (
          <div className="fact-row" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd className={fact.signal === 'suspicious' ? 'fact-suspicious' : undefined}>
              {fact.signal === 'suspicious' ? (
                <>
                  <PixelIcon
                    grid={PIXEL_ART.suspiciousMarker}
                    className="suspicious-marker"
                  />
                  <span className="sr-only">수상한 항목: </span>
                </>
              ) : null}
              <span>{fact.value}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div
        className="sr-only"
        role="progressbar"
        aria-label="경보 판단 남은 시간"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      />
    </article>
  )
}
