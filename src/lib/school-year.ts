/** Année scolaire par défaut (rentrée en septembre ; dès août = nouvelle année). */
export function getDefaultAnneeScolaireLabel(refDate = new Date()): string {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const startYear = month >= 7 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

export function getDefaultAnneeScolaireBounds(refDate = new Date()) {
  const label = getDefaultAnneeScolaireLabel(refDate)
  const startYear = Number(label.slice(0, 4))
  return {
    label,
    date_debut: `${startYear}-09-01`,
    date_fin: `${startYear + 1}-07-31`,
  }
}

/** Ancienne règle (basculait en septembre) — pour corriger les bases récentes. */
export function getLegacyAnneeScolaireLabel(refDate = new Date()): string {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const startYear = month >= 8 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}
