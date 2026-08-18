import { PIXEL_ART } from '../game/data/pixelArt'
import PixelIcon from './PixelIcon'

export type SettingsBarProps = {
  mute: boolean
  reduceMotion: boolean
  pauseDisabled: boolean
  isPaused: boolean
  onToggleMute: () => void
  onToggleReduceMotion: () => void
  onPauseToggle: () => void
}

export default function SettingsBar({
  mute,
  reduceMotion,
  pauseDisabled,
  isPaused,
  onToggleMute,
  onToggleReduceMotion,
  onPauseToggle,
}: SettingsBarProps) {
  return (
    <nav className="settings-bar" aria-label="게임 설정">
      <button type="button" aria-pressed={mute} onClick={onToggleMute}>
        <PixelIcon
          grid={mute ? PIXEL_ART.soundOff : PIXEL_ART.soundOn}
          className="toggle-icon"
        />
        {mute ? 'SOUND OFF' : 'SOUND ON'}
      </button>
      <button
        type="button"
        aria-pressed={reduceMotion}
        onClick={onToggleReduceMotion}
      >
        <PixelIcon
          grid={reduceMotion ? PIXEL_ART.motionOff : PIXEL_ART.motionOn}
          className="toggle-icon"
        />
        {reduceMotion ? 'MOTION REDUCED' : 'MOTION ON'}
      </button>
      <button type="button" disabled={pauseDisabled} onClick={onPauseToggle}>
        {isPaused ? 'RESUME [P]' : 'PAUSE [P]'}
      </button>
    </nav>
  )
}
