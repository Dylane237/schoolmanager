import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, hashPassword } from '@/lib/auth'

describe('auth', () => {
  it('signToken + verifyToken roundtrip', async () => {
    const token = await signToken({
      id: 'user-1',
      role: 'admin',
      ecole_id: 'ecole-1',
      ecole_slug: 'ecole-jean',
      nom: 'Directeur',
    })
    const payload = await verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.role).toBe('admin')
    expect(payload?.ecole_slug).toBe('ecole-jean')
  })

  it('verifyToken rejette token invalide', async () => {
    expect(await verifyToken('invalid.token.here')).toBeNull()
  })

  it('hashPassword produit un hash bcrypt', async () => {
    const hash = await hashPassword('motdepasse123')
    expect(hash).toMatch(/^\$2[ab]\$/)
    expect(hash.length).toBeGreaterThan(50)
  })
})
