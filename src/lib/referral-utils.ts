import type Database from 'better-sqlite3'

export type ParrainageStatut = 'en_cours' | 'abonnement_actif' | 'commission_versee' | 'annule'

export interface ParrainageRow {
  id: string
  contact_nom: string
  contact_ecole: string | null
  contact_telephone: string
  notes: string | null
  statut: ParrainageStatut
  montant_abonnement: number | null
  commission_pct: number
  commission_montant: number | null
  created_at: string
}

export const COMMISSION_PCT = 10

function slugToCodePart(slug: string): string {
  return slug.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8) || 'ECOLE'
}

export function ensureReferralCode(
  db: Database.Database,
  ecoleId: string,
  slug: string,
): string {
  const row = db.prepare('SELECT referral_code FROM ecoles WHERE id = ?').get(ecoleId) as {
    referral_code: string | null
  } | undefined

  if (row?.referral_code) return row.referral_code

  let code = `SM-${slugToCodePart(slug)}`
  let attempt = 0
  while (db.prepare('SELECT id FROM ecoles WHERE referral_code = ? AND id != ?').get(code, ecoleId)) {
    attempt++
    code = `SM-${slugToCodePart(slug)}${attempt}`
  }

  db.prepare('UPDATE ecoles SET referral_code = ? WHERE id = ?').run(code, ecoleId)
  return code
}

export function getParrainagesForEcole(db: Database.Database, ecoleId: string): ParrainageRow[] {
  return db.prepare(`
    SELECT id, contact_nom, contact_ecole, contact_telephone, notes, statut,
           montant_abonnement, commission_pct, commission_montant, created_at
    FROM parrainages
    WHERE parrain_ecole_id = ?
    ORDER BY created_at DESC
  `).all(ecoleId) as ParrainageRow[]
}

export function getReferralStats(parrainages: ParrainageRow[]) {
  const enCours = parrainages.filter(p => p.statut === 'en_cours').length
  const actifs = parrainages.filter(p => p.statut === 'abonnement_actif').length
  const verses = parrainages.filter(p => p.statut === 'commission_versee').length
  const totalCommission = parrainages
    .filter(p => p.commission_montant != null)
    .reduce((s, p) => s + (p.commission_montant ?? 0), 0)

  return { enCours, actifs, verses, totalCommission }
}
