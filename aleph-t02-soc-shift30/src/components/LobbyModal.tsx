import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react'

/**
 * 로비 위에 뜨는 옛 운영체제풍 모달. 규격과 근거는
 * `prompts/04_LOBBY_MODAL_WINDOW_HANDOFF.md`에 있다.
 *
 * `lobby-modal-window.webp`는 **프레임만** 그린 그림이다. 제목·본문·버튼은
 * 전부 HTML로 그림 위에 얹는다. 배경 그림에 UI를 구워넣었다가 되돌린 적이
 * 있어서(리뷰 m-3), 글자가 들어가는 것은 그림에 넣지 않는다.
 *
 * 자리 좌표는 그림을 디코딩해서 실측한 값이고 `global.css`의 CSS 변수에 있다.
 */

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type LobbyModalButton = {
  label: string
  onClick: () => void
  disabled?: boolean
  /** 화면에 보이는 글자가 짧을 때 읽어줄 말을 따로 준다. */
  ariaLabel?: string
}

export type LobbyModalProps = {
  title: string
  onClose: () => void
  reduceMotion: boolean
  /** 그림의 하단 버튼 자리는 정확히 두 개다. */
  buttons: readonly [LobbyModalButton, LobbyModalButton]
  children: ReactNode
}

export default function LobbyModal({
  title,
  onClose,
  reduceMotion,
  buttons,
  children,
}: LobbyModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const focusable = useCallback(
    () =>
      dialogRef.current
        ? [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        : [],
    [],
  )

  // 닫은 뒤의 포커스 복원은 **여는 쪽**이 한다. 여기서 정리에 넣으면 안 된다.
  // 뒤쪽 로비를 inert로 막는데, 모달 정리가 그 해제보다 먼저 돌아서 아직
  // inert인 버튼에 포커스가 거부되고 body로 떨어진다. 실제로 그렇게 났고
  // 계측해서 확인했다(정리 시점에 insideInert가 참).
  useEffect(() => {
    // 첫 조작 가능한 요소로 보낸다. 없으면 닫기 버튼이 항상 있다.
    const [first] = dialogRef.current
      ? [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      : []
    ;(first ?? closeButtonRef.current)?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        // 로비 뒤쪽으로 새어나가면 다른 화면이 같은 키에 반응할 수 있다.
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const items = focusable()
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      // 포커스가 모달 밖으로 나가지 않게 양 끝을 이어붙인다.
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [focusable, onClose],
  )

  return (
    <div className="lobby-modal-backdrop" data-reduce-motion={reduceMotion ? 'true' : 'false'}>
      <div
        className="lobby-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onKeyDown={handleKeyDown}
      >
        <img
          className="lobby-modal-frame"
          src={`${import.meta.env.BASE_URL}lobby-modal-window.webp`}
          alt=""
          aria-hidden="true"
        />
        <h2 className="lobby-modal-title" id={titleId}>
          {title}
        </h2>
        <button
          className="lobby-modal-close"
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          aria-label={`${title} 닫기`}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="lobby-modal-body">{children}</div>
        <div className="lobby-modal-commands">
          {buttons.map((button, index) => (
            <button
              // 자리는 둘뿐이고 순서가 곧 자리다.
              key={index}
              className="lobby-modal-command"
              type="button"
              onClick={button.onClick}
              disabled={button.disabled}
              aria-label={button.ariaLabel}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
