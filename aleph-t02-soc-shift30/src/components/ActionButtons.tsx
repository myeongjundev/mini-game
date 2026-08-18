import type { Action } from '../game/types'

export type ActionButtonsProps = {
  onDecide: (action: Action) => void
  disabled: boolean
}

export default function ActionButtons({ onDecide, disabled }: ActionButtonsProps) {
  return (
    <div className="action-buttons" aria-label="경보 판정">
      <button
        className="action-button action-allow"
        type="button"
        disabled={disabled}
        onClick={() => onDecide('ALLOW')}
      >
        <span>ALLOW</span>
        <kbd>A / ←</kbd>
      </button>
      <button
        className="action-button action-block"
        type="button"
        disabled={disabled}
        onClick={() => onDecide('BLOCK')}
      >
        <span>BLOCK</span>
        <kbd>D / →</kbd>
      </button>
    </div>
  )
}
