import type { Alert, Verdict } from '../types'

const STANDARD_SCORE = 100
const CRITICAL_SCORE = 300
const COMBO_START = 3
const COMBO_STEP = 100
const MAX_COMBO_BONUS = 300

export function calculateScoreGain(
  alert: Alert,
  verdict: Verdict,
  combo: number,
): number {
  if (verdict !== 'CORRECT') {
    return 0
  }

  const baseScore =
    alert.severity === 'CRITICAL' ? CRITICAL_SCORE : STANDARD_SCORE
  const comboBonus = Math.min(
    Math.max(0, combo - (COMBO_START - 1)) * COMBO_STEP,
    MAX_COMBO_BONUS,
  )

  return baseScore + comboBonus
}
