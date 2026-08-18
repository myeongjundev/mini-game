import type { Action, Alert, Verdict } from '../types'

export function resolveAlert(alert: Alert, action: Action): Verdict {
  if (action === alert.correctAction) {
    return 'CORRECT'
  }

  return action === 'BLOCK' ? 'FALSE_POSITIVE' : 'MISSED_THREAT'
}
