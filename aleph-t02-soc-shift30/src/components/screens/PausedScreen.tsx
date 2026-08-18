export type PausedScreenProps = {
  onResume: () => void
  onRestart: () => void
}

export default function PausedScreen({ onResume, onRestart }: PausedScreenProps) {
  return (
    <section className="screen paused-screen" aria-labelledby="paused-title">
      <p className="screen-kicker">SHIFT SUSPENDED</p>
      <h2 id="paused-title">일시정지</h2>
      <p>포커스 이탈 또는 수동 입력으로 게임이 멈췄습니다. 자동으로 재개되지 않습니다.</p>
      <p><kbd>P</kbd> 또는 <kbd>ESC</kbd>로도 재개할 수 있습니다.</p>
      <div className="screen-actions">
        <button className="primary-button" type="button" onClick={onResume}>RESUME</button>
        <button className="secondary-button" type="button" onClick={onRestart}>RESTART</button>
      </div>
    </section>
  )
}
