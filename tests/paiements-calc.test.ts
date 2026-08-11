import { describe, it, expect } from 'vitest'
import { trancheStatut, eleveStatut, countImpayes } from '@/lib/paiements-calc'

describe('paiements-calc', () => {
  it('trancheStatut impaye si rien payé', () => {
    expect(trancheStatut(100_000, 0)).toBe('impaye')
  })

  it('trancheStatut paye si montant complet', () => {
    expect(trancheStatut(100_000, 100_000)).toBe('paye')
    expect(trancheStatut(100_000, 150_000)).toBe('paye')
  })

  it('trancheStatut partiel', () => {
    expect(trancheStatut(100_000, 50_000)).toBe('partiel')
  })

  it('eleveStatut non_configure sans tranches', () => {
    expect(eleveStatut([], null)).toBe('non_configure')
  })

  it('eleveStatut paye si toutes tranches payées', () => {
    expect(eleveStatut([{ statut: 'paye' }, { statut: 'paye' }], null)).toBe('paye')
  })

  it('countImpayes', () => {
    const situations = [
      { statut: 'paye' as const },
      { statut: 'partiel' as const },
      { statut: 'impaye' as const },
    ]
    expect(countImpayes(situations)).toBe(2)
  })
})
