import { DIFFICULTY } from '../game/config'
import { PIXEL_ART } from '../game/data/pixelArt'
import type { GameState } from '../game/types'
import { formatScore, formatSeconds } from '../utils/format'
import PixelIcon from './PixelIcon'

export type HudProps = {
  state: GameState
}

export default function Hud({ state }: HudProps) {
  return (
    <section className="hud" aria-label="게임 상태">
      <div className="hud-item">
        <span className="hud-label">TIME</span>
        <time className="hud-value hud-time">{formatSeconds(state.timeLeftMs)}</time>
      </div>
      <div className="hud-item">
        <span className="hud-label">SCORE</span>
        <strong className="hud-value" data-numeric>{formatScore(state.score)}</strong>
      </div>
      <div className="hud-item hud-security">
        <span className="hud-label">SECURITY</span>
        <span className="heart-row" aria-label={`보안 상태 ${state.lives}/${DIFFICULTY.lives}`}>
          {Array.from({ length: DIFFICULTY.lives }, (_, index) => (
            <PixelIcon
              key={index}
              grid={index < state.lives ? PIXEL_ART.heartFull : PIXEL_ART.heartEmpty}
              className={index < state.lives ? 'heart-icon heart-full' : 'heart-icon heart-empty'}
            />
          ))}
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">COMBO</span>
        <strong className="hud-value" data-numeric>×{state.combo}</strong>
      </div>
    </section>
  )
}
