import { describe, expect, it } from 'vitest'

import type { Alert } from '../types'
import { calculateScoreGain } from './scoring'

const standardAlert = { severity: 'HIGH' } as Alert
const criticalAlert = { severity: 'CRITICAL' } as Alert

describe('calculateScoreGain', () => {
  it('awards the configured base score', () => {
    expect(calculateScoreGain(standardAlert, 'CORRECT', 1)).toBe(100)
    expect(calculateScoreGain(criticalAlert, 'CORRECT', 1)).toBe(300)
  })

  it('starts combo bonuses at three and caps them at 300', () => {
    expect(calculateScoreGain(standardAlert, 'CORRECT', 2)).toBe(100)
    expect(calculateScoreGain(standardAlert, 'CORRECT', 3)).toBe(200)
    expect(calculateScoreGain(standardAlert, 'CORRECT', 8)).toBe(400)
  })

  it('does not award points for either wrong verdict', () => {
    expect(calculateScoreGain(criticalAlert, 'FALSE_POSITIVE', 3)).toBe(0)
    expect(calculateScoreGain(criticalAlert, 'MISSED_THREAT', 3)).toBe(0)
  })
})
