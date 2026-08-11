import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

describe('rate-limit', () => {
  it('autorise les requêtes sous la limite', () => {
    const key = `test-${Date.now()}`
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true)
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true)
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true)
  })

  it('bloque au-delà de la limite', () => {
    const key = `test-block-${Date.now()}`
    for (let i = 0; i < 5; i++) checkRateLimit(key, 3, 60_000)
    const result = checkRateLimit(key, 3, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })
})
