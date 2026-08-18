import { describe, expect, it } from 'vitest'

import { ALERTS } from './alerts'

describe('alert dataset', () => {
  it('contains 15 alerts with exactly four facts each', () => {
    expect(ALERTS).toHaveLength(15)
    expect(ALERTS.every((alert) => alert.facts.length === 4)).toBe(true)
  })

  it('contains five alerts in every tier', () => {
    expect(
      Object.fromEntries(
        [1, 2, 3].map((tier) => [
          tier,
          ALERTS.filter((alert) => alert.tier === tier).length,
        ]),
      ),
    ).toEqual({ 1: 5, 2: 5, 3: 5 })
  })

  it('contains seven ALLOW and eight BLOCK answers', () => {
    expect(ALERTS.filter((alert) => alert.correctAction === 'ALLOW')).toHaveLength(
      7,
    )
    expect(ALERTS.filter((alert) => alert.correctAction === 'BLOCK')).toHaveLength(
      8,
    )
  })
})
