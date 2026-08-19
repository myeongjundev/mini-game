import { describe, expect, it } from 'vitest'

import { PIXEL_ART } from './pixelArt'

const EXPECTED_DIMENSIONS = {
  traffic: [12, 12],
  login: [12, 12],
  scan: [12, 12],
  dns: [12, 12],
  critical: [12, 12],
  heartFull: [9, 8],
  heartEmpty: [9, 8],
  suspiciousMarker: [7, 7],
  correct: [16, 16],
  falsePositive: [16, 16],
  missedThreat: [16, 16],
  soundOn: [12, 12],
  soundOff: [12, 12],
  motionOn: [12, 12],
  motionOff: [12, 12],
  memo: [12, 12],
  gradeA: [16, 16],
  gradeB: [16, 16],
  gradeC: [16, 16],
  gradeD: [16, 16],
  gradeE: [16, 16],
  gradeF: [16, 16],
  favicon: [16, 16],
} as const

describe('pixel art data', () => {
  it('uses only transparent and filled cells with consistent row widths', () => {
    for (const grid of Object.values(PIXEL_ART)) {
      const width = grid[0].length

      expect(grid.every((row) => row.length === width)).toBe(true)
      expect(grid.every((row) => /^[.#]+$/.test(row))).toBe(true)
    }
  })

  it('matches every documented grid dimension', () => {
    for (const [name, [width, height]] of Object.entries(EXPECTED_DIMENSIONS)) {
      const grid = PIXEL_ART[name as keyof typeof PIXEL_ART]

      expect(grid).toHaveLength(height)
      expect(grid.every((row) => row.length === width)).toBe(true)
    }
  })

  it('keeps every grid square except the documented 9x8 life icons', () => {
    for (const [name, grid] of Object.entries(PIXEL_ART)) {
      if (name === 'heartFull' || name === 'heartEmpty') {
        expect([grid[0].length, grid.length]).toEqual([9, 8])
      } else {
        expect(grid[0].length).toBe(grid.length)
      }
    }
  })
})
