import { PIXEL_ART } from '../game/data/pixelArt'
import type { DecisionRecord, Memo, PhoneCall } from '../game/types'
import PixelIcon from './PixelIcon'
import { VERDICT_VIEW } from './VerdictFlash'

export type ShiftLogProps = {
  log: DecisionRecord[]
  /** 근무 중 받은 공지. 경보를 돕던 것이 있으면 그 항목 안에 붙인다. */
  memos?: Memo[]
  /** 이번 판에 걸려 온 전화. 지목한 경보가 안 나왔으면 따로 적는다. */
  call?: PhoneCall | null
}

const ORDER_LABEL = { ALLOW: '통과시켜', BLOCK: '막아' } as const

export default function ShiftLog({ log, memos = [], call = null }: ShiftLogProps) {
  // 지목한 경보가 끝내 나오지 않은 판도 있다. 티어 3 구간이 10초인데
  // 3000ms면 3.3장만 뽑히므로 5장 중 일부는 안 나온다. GAME_SPEC 14.8.
  const callWentUnseen =
    call !== null && !log.some((entry) => entry.alertId === call.alertId)
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
              // 이 경보를 돕던 공지. 틀린 경보 밑에 붙으면 "그 정보를
              // 갖고 있었다"가 드러난다. 짝은 GAME_SPEC 13.4에 있다.
              const memo = memos.find((item) => item.alertId === entry.alertId)

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
                    <span className="shift-log-severity">
                      <span className="sr-only">심각도 </span>
                      {entry.severity}
                    </span>
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
                  <p className="shift-log-explanation">
                    <span className="shift-log-decisive">
                      결정적 항목 · {entry.decisiveFact}
                    </span>
                    {entry.explanation}
                  </p>
                  {entry.order ? (
                    <p className="shift-log-order">
                      지시 “{ORDER_LABEL[entry.order]}” ·{' '}
                      <strong
                        className={
                          entry.orderFollowed
                            ? 'shift-log-order-followed'
                            : 'shift-log-order-refused'
                        }
                      >
                        {entry.orderFollowed ? 'ORDER FOLLOWED' : 'ORDER REFUSED'}
                      </strong>
                    </p>
                  ) : null}
                  {memo ? (
                    <p className="shift-log-memo">
                      <PixelIcon
                        grid={PIXEL_ART.memo}
                        title="사내 공지"
                        className="shift-log-memo-icon"
                      />
                      <span>
                        <span className="shift-log-memo-from">
                          받았던 공지 · {memo.from} {memo.time}
                        </span>
                        {memo.body}
                      </span>
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </>
      )}

      {callWentUnseen ? (
        <p className="shift-log-call-unseen">
          상사가 지목한 경보는 나오기 전에 근무가 끝났습니다 · 지시 “
          {ORDER_LABEL[call.order]}”
        </p>
      ) : null}
    </section>
  )
}
