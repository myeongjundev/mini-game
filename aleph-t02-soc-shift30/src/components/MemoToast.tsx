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
 * 경보 카드를 덮는다. 시선이 이미 카드에 있어서 놓칠 일이 없고,
 * 화면 아래 판정 표시와 겹치지도 않는다. 떠 있는 동안 판정 입력과
 * 경보 제한 시간이 함께 멈추므로 가려도 손해가 없다.
 */
export default function MemoToast({ memo, onDismiss }: MemoToastProps) {
  return (
    <aside className="memo-toast" aria-live="assertive" aria-label="사내 공지">
      <p className="memo-head">
        <PixelIcon grid={PIXEL_ART.memo} title="사내 공지" className="memo-icon" />
        <span className="memo-from">{memo.from}</span>
        <time className="memo-time">{memo.time}</time>
      </p>
      <p className="memo-body">{memo.body}</p>
      <p className="memo-note">판정 대기 중 · 경보 제한 시간이 멈춰 있습니다</p>
      <button className="memo-dismiss" type="button" onClick={onDismiss}>
        SPACE 로 닫기
      </button>
    </aside>
  )
}
