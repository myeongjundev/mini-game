import { DIFFICULTY } from '../game/config'
import { PIXEL_ART } from '../game/data/pixelArt'
import type { GameState } from '../game/types'
import { formatScore, formatSeconds } from '../utils/format'
import PixelIcon from './PixelIcon'

export type HudProps = {
  state: GameState
  /** 방금 라이프를 잃었는가. 꺼진 하트 하나에만 표시를 붙인다. */
  lifeLost?: boolean
}

export default function Hud({ state, lifeLost = false }: HudProps) {
  // 마지막 하나가 남으면 줄 전체가 경고 상태가 된다. 색만으로 알리지
  // 않는다 — 하트는 가득 참과 빔의 모양이 이미 다르다.
  const critical = state.lives === 1

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
        <span
          className={critical ? 'heart-row heart-row-critical' : 'heart-row'}
          aria-label={`보안 상태 ${state.lives}/${DIFFICULTY.lives}`}
        >
          {Array.from({ length: DIFFICULTY.lives }, (_, index) => {
            const full = index < state.lives
            // 방금 꺼진 하트는 남은 개수 바로 다음 자리다.
            const justLost = lifeLost && index === state.lives
            const classes = [
              'heart-icon',
              full ? 'heart-full' : 'heart-empty',
              justLost ? 'heart-just-lost' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <PixelIcon
                key={index}
                grid={full ? PIXEL_ART.heartFull : PIXEL_ART.heartEmpty}
                className={classes}
              />
            )
          })}
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">COMBO</span>
        <strong className="hud-value" data-numeric>×{state.combo}</strong>
      </div>
    </section>
  )
}
