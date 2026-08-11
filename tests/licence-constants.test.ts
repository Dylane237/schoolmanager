import { describe, it, expect } from 'vitest'
import {
  isPoolLicenceKey,
  licenceDaysLeft,
  PLAN_STUDENT_LIMITS,
  PLAN_PRICES,
} from '@/lib/licence-constants'

describe('licence-constants', () => {
  it('isPoolLicenceKey', () => {
    expect(isPoolLicenceKey('PREMIUM-POOL-2026-AB12CD34')).toBe(true)
    expect(isPoolLicenceKey('PREMIUM-DYLA-2026-AB12CD')).toBe(false)
  })

  it('licenceDaysLeft', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const iso = future.toISOString().split('T')[0]
    expect(licenceDaysLeft(iso)).toBeGreaterThanOrEqual(29)
    expect(licenceDaysLeft(iso)).toBeLessThanOrEqual(31)
  })

  it('plans définis', () => {
    expect(PLAN_STUDENT_LIMITS.starter).toBe(150)
    expect(PLAN_STUDENT_LIMITS.premium).toBeNull()
    expect(PLAN_PRICES.standard).toBe(350_000)
  })
})
