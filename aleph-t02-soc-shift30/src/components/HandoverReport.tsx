import { buildHandover } from '../game/engine/handover'
import type { GameState } from '../game/types'

export type HandoverReportProps = {
  state: GameState
}

export default function HandoverReport({ state }: HandoverReportProps) {
  const report = buildHandover(state)

  return (
    <section className="handover" aria-labelledby="handover-title">
      <h3 id="handover-title" className="handover-title">
        INCIDENT HANDOVER
      </h3>
      <p className="handover-period">{report.period} · 야간 당직</p>
      {report.blocks.map((block, index) => (
        <div className="handover-block" key={index}>
          {block.time ? <span className="handover-time">{block.time}</span> : null}
          <div className="handover-lines">
            {block.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
