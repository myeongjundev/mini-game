import { PIXEL_ART } from '../game/data/pixelArt'
import type { DecisionRecord } from '../game/types'
import PixelIcon from './PixelIcon'
import { VERDICT_VIEW } from './VerdictFlash'

export type ShiftLogProps = {
  log: DecisionRecord[]
}

export default function ShiftLog({ log }: ShiftLogProps) {
  const missed = log.filter((entry) => entry.verdict !== 'CORRECT').length

  return (
    <section className="shift-log" aria-labelledby="shift-log-title">
      <h3 id="shift-log-title" className="section-label">
        SHIFT LOG
      </h3>

      {log.length === 0 ? (
        <p className="shift-log-empty">판정한 경보가 없습니다.</p>
      ) : (
        <>
          <p className="shift-log-summary">
            {log.length}장 중 {missed}장을 놓쳤습니다
          </p>
          <ol className="shift-log-list" tabIndex={0} aria-label="판정 기록 목록">
            {log.map((entry, index) => {
              const view = VERDICT_VIEW[entry.verdict]

              return (
                <li
                  className={
                    entry.verdict === 'CORRECT'
                      ? 'shift-log-item'
                      : 'shift-log-item shift-log-item-failed'
                  }
                  key={`${entry.alertId}-${index}`}
                >
                  <div className="shift-log-head">
                    <PixelIcon
                      grid={PIXEL_ART[entry.category]}
                      title={`${entry.category} 카테고리`}
                      className="category-icon"
                    />
                    <span className="shift-log-title">{entry.title}</span>
                    <span className="shift-log-action">
                      <span className="sr-only">내 판단 </span>
                      {entry.action ?? '—'}
                    </span>
                    <span className={`shift-log-verdict ${view.className}`}>
                      <PixelIcon
                        grid={view.grid}
                        title={view.label}
                        className="shift-log-verdict-icon"
                      />
                      {view.label}
                    </span>
                  </div>
                  <p className="shift-log-explanation">{entry.explanation}</p>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}
