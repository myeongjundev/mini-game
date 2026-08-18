import { PIXEL_ART } from '../game/data/pixelArt'
import type { Alert } from '../game/types'
import PixelIcon from './PixelIcon'

export type AlertCardProps = {
  alert: Alert
  timeRemainingRatio: number
}

export default function AlertCard({ alert, timeRemainingRatio }: AlertCardProps) {
  const progress = Math.min(1, Math.max(0, timeRemainingRatio))

  return (
    <article className={`alert-card severity-${alert.severity.toLowerCase()}`}>
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
          <span className="alert-meta">TIER {alert.tier} / {alert.severity}</span>
          <h2>{alert.title}</h2>
        </div>
      </header>
      <dl className="fact-grid">
        {alert.facts.map((fact) => (
          <div className="fact-row" key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
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
