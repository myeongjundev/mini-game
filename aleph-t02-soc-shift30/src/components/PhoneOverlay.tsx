export type PhoneOverlayMode = 'ringing' | 'connected'

type PhoneOverlayCommonProps = {
  caller: string
  message: string
}

export type PhoneOverlayProps = PhoneOverlayCommonProps & ({
  mode: 'ringing'
  ringProgress: number
  onAnswer: () => void
  onLater: () => void
} | {
  mode: 'connected'
  onHangUp: () => void
})

const ASSET_BY_MODE = {
  ringing: 'phone-call.webp',
  connected: 'phone-connected.webp',
} as const satisfies Record<PhoneOverlayMode, string>

/*
 * GAME_SPEC 14절의 전화 규칙은 난이도 실험 뒤에 연결한다. 이 컴포넌트는
 * 브라우저 상태나 타이머를 소유하지 않고, 확정된 두 화면만 그린다.
 */
export default function PhoneOverlay(props: PhoneOverlayProps) {
  const { mode, caller, message } = props
  const progress = mode === 'ringing'
    ? Math.min(1, Math.max(0, props.ringProgress))
    : 1
  const connected = mode === 'connected'

  return (
    <aside
      className={`phone-overlay phone-overlay-${mode}`}
      aria-label={connected ? '통화 연결' : '전화 수신'}
      aria-live="assertive"
    >
      <header className="phone-overlay-head">
        <span className="phone-status-light" aria-hidden="true" />
        <span>{connected ? 'SECURE LINE // CONNECTED' : 'SECURE LINE // INCOMING'}</span>
        <span className="phone-overlay-channel">CH 03</span>
      </header>

      <div className="phone-overlay-body">
        <div className="phone-overlay-visual" aria-hidden="true">
          {connected ? (
            <img
              className="phone-caller-portrait"
              src={`${import.meta.env.BASE_URL}team-lead-portrait-128.png`}
              alt=""
            />
          ) : null}
          <img
            className="phone-device-art"
            src={`${import.meta.env.BASE_URL}${ASSET_BY_MODE[mode]}`}
            alt=""
          />
        </div>

        <div className="phone-overlay-copy">
          <p className="phone-overlay-kicker">
            {connected ? 'VOICE AUTHENTICATED' : 'PRIORITY CALL'}
          </p>
          <h2>{caller}</h2>
          <p className="phone-overlay-message">“{message}”</p>

          {!connected ? (
            <div
              className="phone-ring-track"
              role="progressbar"
              aria-label="전화를 받을 수 있는 남은 시간"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
          ) : (
            <p className="phone-overlay-note">상사의 지시도 카드의 증거와 대조하십시오.</p>
          )}
        </div>
      </div>

      <footer className="phone-overlay-actions">
        {props.mode === 'connected' ? (
          <button type="button" onClick={props.onHangUp}>
            <kbd>↓</kbd> 통화 종료
          </button>
        ) : (
          <>
            <button type="button" onClick={props.onAnswer}>
              <kbd>↑</kbd> 받기
            </button>
            <button type="button" onClick={props.onLater}>
              <kbd>↓</kbd> 나중에
            </button>
          </>
        )}
      </footer>
    </aside>
  )
}
