import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ALERTS } from '../game/data/alerts'
import { createInitialGameState } from '../game/engine/machine'
import AlertCard from './AlertCard'
import PausedScreen from './screens/PausedScreen'
import ResultScreen from './screens/ResultScreen'

describe('screen components', () => {
  it('renders alert facts and progress without exposing the correct action', () => {
    const alert = ALERTS[0]
    const markup = renderToStaticMarkup(
      <AlertCard alert={alert} timeRemainingRatio={0.5} />,
    )

    expect(markup).toContain(alert.title)
    expect(markup.match(/<dt>/g)).toHaveLength(4)
    expect(markup).toContain('scaleX(0.5)')
    expect(markup).not.toContain(alert.correctAction)
  })

  it('includes both resume and restart controls on the paused screen', () => {
    const markup = renderToStaticMarkup(
      <PausedScreen onResume={() => undefined} onRestart={() => undefined} />,
    )

    expect(markup).toContain('RESUME')
    expect(markup).toContain('RESTART')
  })

  it('renders the complete result report and distinct failure bars', () => {
    const state = {
      ...createInitialGameState(),
      phase: 'FAILURE' as const,
      timeLeftMs: 12_000,
      score: 500,
      reviewed: 5,
      threatsBlocked: 2,
      normalAllowed: 1,
      falsePositives: 1,
      missedThreats: 1,
      timeouts: 2,
      maxCombo: 3,
    }
    const markup = renderToStaticMarkup(
      <ResultScreen state={state} bestScore={800} onRestart={() => undefined} />,
    )

    for (const label of [
      'RESULT',
      'SCORE',
      'ALERTS REVIEWED',
      'THREATS BLOCKED',
      'NORMAL ALLOWED',
      'FALSE POSITIVES',
      'MISSED THREATS',
      'NO DECISIONS',
      'ACCURACY',
      'MAX COMBO',
      'BEST SCORE',
      'SURVIVAL TIME',
    ]) {
      expect(markup).toContain(label)
    }
    expect(markup).toContain('error-false-positive')
    expect(markup).toContain('error-missed-threat')
  })
})
