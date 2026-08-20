import { PIXEL_ART } from '../game/data/pixelArt'
import { PORTRAIT_BY_DEPARTMENT, portraitUrl } from '../game/data/portraits'
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
  const portrait = PORTRAIT_BY_DEPARTMENT[memo.from]

  return (
    <aside className="memo-toast" aria-live="assertive" aria-label="사내 공지">
      <p className="memo-head">
        {/* 보낸 사람의 얼굴이 있으면 공지 아이콘 자리를 대신한다. 한 줄에
            그림 둘을 두면 좁아지고, 공지라는 것은 이 판 전체가 이미
            말하고 있다. 부서 이름은 아래에 글자로 그대로 남는다. */}
        {portrait === undefined ? (
          <PixelIcon grid={PIXEL_ART.memo} title="사내 공지" className="memo-icon" />
        ) : (
          <img
            className="memo-portrait"
            src={portraitUrl(portrait)}
            alt=""
            aria-hidden="true"
            width={128}
            height={128}
          />
        )}
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
