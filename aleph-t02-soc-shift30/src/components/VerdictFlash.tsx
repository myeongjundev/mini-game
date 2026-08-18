import { PIXEL_ART } from '../game/data/pixelArt'
import type { PixelGrid } from '../game/data/pixelArt'
import type { Verdict } from '../game/types'
import PixelIcon from './PixelIcon'

export type VerdictFlashProps = {
  verdict: Verdict
  decisiveFact: string
  explanation: string
}

export const VERDICT_VIEW: Record<Verdict, { label: string; grid: PixelGrid; className: string }> = {
  CORRECT: { label: 'CORRECT', grid: PIXEL_ART.correct, className: 'verdict-correct' },
  FALSE_POSITIVE: {
    label: 'FALSE POSITIVE',
    grid: PIXEL_ART.falsePositive,
    className: 'verdict-false-positive',
  },
  MISSED_THREAT: {
    label: 'MISSED THREAT',
    grid: PIXEL_ART.missedThreat,
    className: 'verdict-missed-threat',
  },
  TIMEOUT: {
    label: 'NO DECISION',
    grid: PIXEL_ART.missedThreat,
    className: 'verdict-timeout',
  },
}

export default function VerdictFlash({
  verdict,
  decisiveFact,
  explanation,
}: VerdictFlashProps) {
  const view = VERDICT_VIEW[verdict]

  return (
    <aside className={`verdict-flash ${view.className}`} role="status" aria-live="polite">
      <PixelIcon grid={view.grid} title={view.label} className="verdict-icon" />
      <div>
        <strong>{view.label}</strong>
        {decisiveFact ? (
          <p className="verdict-decisive">결정적 항목 · {decisiveFact}</p>
        ) : null}
        <p>{explanation}</p>
      </div>
    </aside>
  )
}
