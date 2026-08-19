import { PIXEL_ART } from '../game/data/pixelArt'
import type { Memo } from '../game/types'
import PixelIcon from './PixelIcon'

export type MemoLogProps = {
  memos: Memo[]
  /**
   * 근무 중 실제로 나온 경보의 id. 결과 화면에서만 넘긴다.
   *
   * 슬롯 3·4는 티어 3 경보를 돕는데 티어 3은 20초부터다. 그 전에 판이
   * 끝나면 그 공지들은 가리킬 경보가 없었던 셈이라, 왜 쓸모가 없었는지
   * 화면에 남긴다. 근무 중에는 아직 올 수 있으므로 넘기지 않는다.
   */
  seenAlertIds?: string[]
}

/**
 * 근무 중 받은 공지를 모아 둔다. 규칙은 `docs/GAME_SPEC.md` 13.6-1.
 *
 * 메모는 닫으면 사라지는데 연결 경보는 최대 17초 뒤에 온다. 다시 읽을
 * 데가 없으면 방해만 남고 정보는 못 준다. 그래서 닫은 뒤에도 여기 남긴다.
 *
 * 판이 시작될 때부터 자리를 지킨다. 첫 메모가 뜬 3초에 갑자기 나타나면
 * 그때 화면이 밀리고, 여기에 쌓인다는 것도 알 수 없다.
 */
export default function MemoLog({ memos, seenAlertIds }: MemoLogProps) {
  return (
    <aside className="memo-log" aria-label="받은 공지">
      <h3 className="memo-log-title">
        <PixelIcon
          grid={PIXEL_ART.memo}
          title="사내 공지"
          className="memo-log-icon"
        />
        MEMOS
      </h3>

      {memos.length === 0 ? (
        <p className="memo-log-empty">받은 공지가 없습니다.</p>
      ) : (
        <ol className="memo-log-list">
          {memos.map((memo, index) => {
            const missed =
              seenAlertIds !== undefined &&
              !seenAlertIds.includes(memo.alertId)

            return (
              <li className="memo-log-item" key={`${memo.id}-${index}`}>
                <p className="memo-log-head">
                  <span className="memo-log-from">{memo.from}</span>
                  <time className="memo-log-time">{memo.time}</time>
                </p>
                <p className="memo-log-body">{memo.body}</p>
                {missed ? (
                  <p className="memo-log-missed">
                    이 공지의 경보는 나오기 전에 근무가 끝났습니다
                  </p>
                ) : null}
              </li>
            )
          })}
        </ol>
      )}
    </aside>
  )
}
