import { DIFFICULTY } from '../config'
import type { Alert, Tier } from '../types'

type AlertsByTier = Record<Tier, readonly Alert[]>

export type AlertQueueState = {
  alertsByTier: AlertsByTier
  remainingByTier: AlertsByTier
  previousAlertId: string | null
  randomState: number
}

export type AlertDraw = {
  alert: Alert
  queue: AlertQueueState
}

const RANDOM_MULTIPLIER = 1_664_525
const RANDOM_INCREMENT = 1_013_904_223
const RANDOM_DIVISOR = 0x1_0000_0000

function createSessionSeed(): number {
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const values = new Uint32Array(1)
    globalThis.crypto.getRandomValues(values)
    return values[0]
  }

  return (Date.now() ^ Math.floor(Math.random() * RANDOM_DIVISOR)) >>> 0
}

function nextRandom(state: number): { value: number; state: number } {
  const nextState = (Math.imul(state, RANDOM_MULTIPLIER) + RANDOM_INCREMENT) >>> 0

  return { value: nextState / RANDOM_DIVISOR, state: nextState }
}

function shuffle(
  alerts: readonly Alert[],
  initialRandomState: number,
): { alerts: Alert[]; randomState: number } {
  const shuffled = [...alerts]
  let randomState = initialRandomState

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const random = nextRandom(randomState)
    randomState = random.state
    const swapIndex = Math.floor(random.value * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  return { alerts: shuffled, randomState }
}

function avoidImmediateRepeat(
  alerts: Alert[],
  previousAlertId: string | null,
): Alert[] {
  if (alerts.length < 2 || alerts[0].id !== previousAlertId) {
    return alerts
  }

  const replacementIndex = alerts.findIndex(
    (alert, index) => index > 0 && alert.id !== previousAlertId,
  )

  if (replacementIndex > 0) {
    ;[alerts[0], alerts[replacementIndex]] = [
      alerts[replacementIndex],
      alerts[0],
    ]
  }

  return alerts
}

export function getTierForElapsedTime(elapsedMs: number): Tier {
  const safeElapsedMs = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0
  const tierDurationMs = DIFFICULTY.totalTimeMs / 3

  if (safeElapsedMs < tierDurationMs) {
    return 1
  }

  if (safeElapsedMs < tierDurationMs * 2) {
    return 2
  }

  return 3
}

export function createAlertQueue(
  alerts: readonly Alert[],
  seed = createSessionSeed(),
): AlertQueueState {
  const alertsByTier: AlertsByTier = {
    1: alerts.filter((alert) => alert.tier === 1),
    2: alerts.filter((alert) => alert.tier === 2),
    3: alerts.filter((alert) => alert.tier === 3),
  }

  for (const tier of [1, 2, 3] as const) {
    if (alertsByTier[tier].length === 0) {
      throw new Error(`No alerts configured for tier ${tier}`)
    }

    // At least two per tier are required to guarantee no immediate repeat.
    if (alertsByTier[tier].length === 1) {
      throw new Error(`At least 2 alerts required for tier ${tier}`)
    }
  }

  return {
    alertsByTier,
    remainingByTier: { 1: [], 2: [], 3: [] },
    previousAlertId: null,
    randomState: seed >>> 0,
  }
}

export function drawNextAlert(
  queue: AlertQueueState,
  elapsedMs: number,
): AlertDraw {
  const tier = getTierForElapsedTime(elapsedMs)
  const configuredAlerts = queue.alertsByTier[tier]
  let remaining = [...queue.remainingByTier[tier]]
  let randomState = queue.randomState

  if (remaining.length === 0) {
    const shuffled = shuffle(configuredAlerts, randomState)
    remaining = avoidImmediateRepeat(shuffled.alerts, queue.previousAlertId)
    randomState = shuffled.randomState
  }

  const [alert, ...rest] = remaining

  return {
    alert,
    queue: {
      ...queue,
      remainingByTier: { ...queue.remainingByTier, [tier]: rest },
      previousAlertId: alert.id,
      randomState,
    },
  }
}
