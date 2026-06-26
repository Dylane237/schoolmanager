import type Database from 'better-sqlite3'
import { getActiveAnneeScolaire } from './db-server'

export type TrancheStatut = 'paye' | 'partiel' | 'impaye'
export type SituationStatut = TrancheStatut | 'non_configure'

export interface PaiementHistorique {
  id: string
  eleve_id: string
  montant: number
  date_paiement: string
  mode_paiement: string
  recu_numero: string
  tranche_numero: number | null
}

export interface TrancheSituation {
  tranche_numero: number
  montant_attendu: number
  montant_paye: number
  reste: number
  date_limite: string | null
  statut: TrancheStatut
  historique: PaiementHistorique[]
}

export interface EleveSituation {
  eleve_id: string
  nom: string
  prenom: string
  numero_matricule: string
  classe_id: string | null
  classe_nom: string | null
  total_attendu: number
  total_paye: number
  total_reste: number
  statut: SituationStatut
  tranches: TrancheSituation[]
}

function trancheStatut(attendu: number, paye: number): TrancheStatut {
  if (paye <= 0) return 'impaye'
  if (paye >= attendu) return 'paye'
  return 'partiel'
}

function eleveStatut(tranches: TrancheSituation[]): SituationStatut {
  if (tranches.length === 0) return 'non_configure'
  if (tranches.every(t => t.statut === 'paye')) return 'paye'
  if (tranches.every(t => t.statut === 'impaye')) return 'impaye'
  return 'partiel'
}

export function getElevesSituation(
  db: Database.Database,
  ecoleId: string,
  options?: { classeId?: string; search?: string; annee?: string },
): { situations: EleveSituation[]; annee_scolaire: string } {
  const annee = options?.annee ?? getActiveAnneeScolaire(db, ecoleId)

  let elevesQuery = `
    SELECT e.id as eleve_id, e.nom, e.prenom, e.numero_matricule,
           e.classe_id, c.nom as classe_nom
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.ecole_id = ? AND e.statut = 'actif'
  `
  const elevesParams: unknown[] = [ecoleId]

  if (options?.classeId) {
    elevesQuery += ' AND e.classe_id = ?'
    elevesParams.push(options.classeId)
  }
  if (options?.search) {
    elevesQuery += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.numero_matricule LIKE ?)'
    elevesParams.push(`%${options.search}%`, `%${options.search}%`, `%${options.search}%`)
  }
  elevesQuery += ' ORDER BY c.nom, e.nom, e.prenom'

  const eleves = db.prepare(elevesQuery).all(...elevesParams) as {
    eleve_id: string
    nom: string
    prenom: string
    numero_matricule: string
    classe_id: string | null
    classe_nom: string | null
  }[]

  const tranchesConfig = db.prepare(`
    SELECT classe_id, tranche_numero, montant_attendu, date_limite
    FROM tranches_config
    WHERE ecole_id = ? AND annee_scolaire = ?
    ORDER BY classe_id, tranche_numero
  `).all(ecoleId, annee) as {
    classe_id: string
    tranche_numero: number
    montant_attendu: number
    date_limite: string | null
  }[]

  const tranchesByClasse = new Map<string, typeof tranchesConfig>()
  for (const tc of tranchesConfig) {
    const list = tranchesByClasse.get(tc.classe_id) ?? []
    list.push(tc)
    tranchesByClasse.set(tc.classe_id, list)
  }

  const paiements = db.prepare(`
    SELECT id, eleve_id, tranche_numero, montant, date_paiement, mode_paiement, recu_numero
    FROM paiements
    WHERE ecole_id = ?
    ORDER BY date_paiement DESC, created_at DESC
  `).all(ecoleId) as PaiementHistorique[]

  const paiementsByEleveTranche = new Map<string, PaiementHistorique[]>()
  const totalPayeByEleve = new Map<string, number>()

  for (const p of paiements) {
    totalPayeByEleve.set(p.eleve_id, (totalPayeByEleve.get(p.eleve_id) ?? 0) + p.montant)
    if (p.tranche_numero != null) {
      const key = `${p.eleve_id}:${p.tranche_numero}`
      const list = paiementsByEleveTranche.get(key) ?? []
      list.push(p)
      paiementsByEleveTranche.set(key, list)
    }
  }

  const situations: EleveSituation[] = eleves.map(eleve => {
    const config = eleve.classe_id ? tranchesByClasse.get(eleve.classe_id) ?? [] : []

    const tranches: TrancheSituation[] = config.map(tc => {
      const key = `${eleve.eleve_id}:${tc.tranche_numero}`
      const historique = paiementsByEleveTranche.get(key) ?? []
      const montant_paye = historique.reduce((s, h) => s + h.montant, 0)
      const reste = Math.max(0, tc.montant_attendu - montant_paye)

      return {
        tranche_numero: tc.tranche_numero,
        montant_attendu: tc.montant_attendu,
        montant_paye,
        reste,
        date_limite: tc.date_limite,
        statut: trancheStatut(tc.montant_attendu, montant_paye),
        historique,
      }
    })

    const total_attendu = tranches.reduce((s, t) => s + t.montant_attendu, 0)
    const total_paye = tranches.length > 0
      ? tranches.reduce((s, t) => s + t.montant_paye, 0)
      : (totalPayeByEleve.get(eleve.eleve_id) ?? 0)
    const total_reste = tranches.length > 0
      ? tranches.reduce((s, t) => s + t.reste, 0)
      : 0

    return {
      ...eleve,
      total_attendu,
      total_paye,
      total_reste,
      statut: eleveStatut(tranches),
      tranches,
    }
  })

  return { situations, annee_scolaire: annee }
}

export function countImpayes(situations: EleveSituation[]): number {
  return situations.filter(s =>
    s.statut === 'impaye' || s.statut === 'partiel'
  ).length
}

export function getEleveSituation(
  db: Database.Database,
  ecoleId: string,
  eleveId: string,
): EleveSituation | null {
  const { situations } = getElevesSituation(db, ecoleId)
  return situations.find(s => s.eleve_id === eleveId) ?? null
}
