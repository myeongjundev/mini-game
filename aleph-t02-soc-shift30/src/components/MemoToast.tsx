import { PIXEL_ART } from '../game/data/pixelArt'
import type { Memo } from '../game/types'
import PixelIcon from './PixelIcon'

export type MemoToastProps = {
  memo: Memo
  onDismiss: () => void
}

/**
 * 근무 중 올라오는 사내 공지. 규칙은 `docs/GAME_SPEC.md` 13절.
 *
 * 떠 있는 동안 판정 입력이 막힌다. 비용의 상한은 플레이어가 정한다.
 * 바로 닫으면 거의 0이고, 읽으면 뒤에 올 경보의 근거를 얻는다.
 */
export default function MemoToast({ memo, onDismiss }: MemoToastProps) {
  return (
    <aside className="memo-toast" aria-live="assertive" aria-label="사내 공지">
      <PixelIcon grid={PIXEL_ART.memo} title="사내 공지" className="memo-icon" />
      <div className="memo-text">
        <p className="memo-head">
          <span className="memo-from">{memo.from}</span>
          <time className="memo-time">{memo.time}</time>
        </p>
        <p className="memo-body">{memo.body}</p>
      </div>
      <button className="memo-dismiss" type="button" onClick={onDismiss}>
        SPACE 로 닫기
      </button>
    </aside>
  )
}
