import { describe, expect, it } from 'vitest'

import type { Alert } from '../types'
import { resolveAlert } from './rules'

const normalAlert = { correctAction: 'ALLOW' } as Alert
const threatAlert = { correctAction: 'BLOCK' } as Alert

describe('resolveAlert', () => {
  it('accepts the correct action for normal and threat alerts', () => {
    expect(resolveAlert(normalAlert, 'ALLOW')).toBe('CORRECT')
    expect(resolveAlert(threatAlert, 'BLOCK')).toBe('CORRECT')
  })

  it('distinguishes false positives from missed threats', () => {
    expect(resolveAlert(normalAlert, 'BLOCK')).toBe('FALSE_POSITIVE')
    expect(resolveAlert(threatAlert, 'ALLOW')).toBe('MISSED_THREAT')
  })
})
