export type TrancheStatut = 'paye' | 'partiel' | 'impaye'
export type SituationStatut = TrancheStatut | 'non_configure'

export function trancheStatut(attendu: number, paye: number): TrancheStatut {
  if (paye <= 0) return 'impaye'
  if (paye >= attendu) return 'paye'
  return 'partiel'
}

export function eleveStatut(
  tranches: { statut: TrancheStatut }[],
  fraisExamen: { statut: TrancheStatut; montant_attendu: number } | null,
): SituationStatut {
  const parts: TrancheStatut[] = tranches.map(t => t.statut)
  if (fraisExamen && fraisExamen.montant_attendu > 0) {
    parts.push(fraisExamen.statut)
  }
  if (parts.length === 0) return 'non_configure'
  if (parts.every(s => s === 'paye')) return 'paye'
  if (parts.every(s => s === 'impaye')) return 'impaye'
  return 'partiel'
}

export function countImpayes<T extends { statut: SituationStatut }>(situations: T[]): number {
  return situations.filter(s => s.statut === 'impaye' || s.statut === 'partiel').length
}
