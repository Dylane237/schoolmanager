import type Database from 'better-sqlite3'
import { getActiveAnneeScolaire } from './db-server'

export type FraisExamenStatut = 'paye' | 'partiel' | 'impaye' | 'non_configure'

export interface FraisExamenConfig {
  id: string
  classe_id: string
  label: string
  montant: number
  date_limite: string | null
  annee_scolaire: string
  obligatoire: number
}

export interface FraisExamenSituation {
  config: FraisExamenConfig | null
  montant_attendu: number
  montant_paye: number
  reste: number
  statut: FraisExamenStatut
  date_limite: string | null
  jours_restants: number | null
  en_retard: boolean
}

function fraisStatut(attendu: number, paye: number): FraisExamenStatut {
  if (attendu <= 0) return 'non_configure'
  if (paye <= 0) return 'impaye'
  if (paye >= attendu) return 'paye'
  return 'partiel'
}

function joursRestants(dateLimite: string | null): { jours: number | null; enRetard: boolean } {
  if (!dateLimite) return { jours: null, enRetard: false }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limite = new Date(dateLimite)
  limite.setHours(0, 0, 0, 0)
  const jours = Math.ceil((limite.getTime() - today.getTime()) / 86400000)
  return { jours, enRetard: jours < 0 }
}

export function getFraisExamenConfig(
  db: Database.Database,
  ecoleId: string,
  classeId: string,
  annee?: string,
): FraisExamenConfig | null {
  const a = annee ?? getActiveAnneeScolaire(db, ecoleId)
  return db.prepare(`
    SELECT id, classe_id, label, montant, date_limite, annee_scolaire, obligatoire
    FROM frais_annexes
    WHERE ecole_id = ? AND classe_id = ? AND annee_scolaire = ? AND type = 'examen'
    LIMIT 1
  `).get(ecoleId, classeId, a) as FraisExamenConfig | undefined ?? null
}

export function getMontantPayeFraisExamen(
  db: Database.Database,
  eleveId: string,
  fraisAnnexeId: string,
): number {
  const row = db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total
    FROM paiements
    WHERE eleve_id = ? AND frais_annexe_id = ?
  `).get(eleveId, fraisAnnexeId) as { total: number }
  return row.total
}

export function getFraisExamenSituationForEleve(
  db: Database.Database,
  ecoleId: string,
  eleveId: string,
  annee?: string,
): FraisExamenSituation {
  const empty: FraisExamenSituation = {
    config: null,
    montant_attendu: 0,
    montant_paye: 0,
    reste: 0,
    statut: 'non_configure',
    date_limite: null,
    jours_restants: null,
    en_retard: false,
  }

  const eleve = db.prepare(`
    SELECT classe_id FROM eleves WHERE id = ? AND ecole_id = ?
  `).get(eleveId, ecoleId) as { classe_id: string | null } | undefined

  if (!eleve?.classe_id) return empty

  const config = getFraisExamenConfig(db, ecoleId, eleve.classe_id, annee)
  if (!config) return empty

  const montant_paye = getMontantPayeFraisExamen(db, eleveId, config.id)
  const montant_attendu = config.montant
  const reste = Math.max(0, montant_attendu - montant_paye)
  const statut = fraisStatut(montant_attendu, montant_paye)
  const { jours, enRetard } = joursRestants(config.date_limite)

  return {
    config,
    montant_attendu,
    montant_paye,
    reste,
    statut,
    date_limite: config.date_limite,
    jours_restants: jours,
    en_retard: enRetard && statut !== 'paye',
  }
}

export interface EleveFraisExamenResume {
  eleve_id: string
  statut: FraisExamenStatut
  reste: number
  montant_paye: number
}

export function getFraisExamenResumeForClasse(
  db: Database.Database,
  ecoleId: string,
  classeId: string,
  annee?: string,
): { config: FraisExamenConfig | null; eleves: EleveFraisExamenResume[]; impayes: number } {
  const config = getFraisExamenConfig(db, ecoleId, classeId, annee)
  const elevesRows = db.prepare(`
    SELECT id FROM eleves WHERE classe_id = ? AND ecole_id = ? AND statut = 'actif'
  `).all(classeId, ecoleId) as { id: string }[]

  const eleves = elevesRows.map(e => {
    const s = getFraisExamenSituationForEleve(db, ecoleId, e.id, annee)
    return {
      eleve_id: e.id,
      statut: s.statut,
      reste: s.reste,
      montant_paye: s.montant_paye,
    }
  })

  const impayes = config
    ? eleves.filter(r => r.statut === 'impaye' || r.statut === 'partiel').length
    : 0

  return { config, eleves, impayes }
}
