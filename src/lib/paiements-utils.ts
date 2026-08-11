import type Database from 'better-sqlite3'
import { getActiveAnneeScolaire } from './db-server'
import { trancheStatut, eleveStatut, countImpayes, type TrancheStatut, type SituationStatut } from './paiements-calc'

export type { TrancheStatut, SituationStatut }
export { countImpayes }

export interface PaiementHistorique {
  id: string
  eleve_id: string
  montant: number
  date_paiement: string
  mode_paiement: string
  recu_numero: string
  tranche_numero: number | null
  frais_annexe_id: string | null
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

export interface FraisExamenLine {
  frais_annexe_id: string
  label: string
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
  frais_examen: FraisExamenLine | null
}

export function getElevesSituation(
  db: Database.Database,
  ecoleId: string,
  options?: { classeId?: string; search?: string; annee?: string; statut?: string },
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

  const examConfigs = db.prepare(`
    SELECT id, classe_id, label, montant, date_limite
    FROM frais_annexes
    WHERE ecole_id = ? AND annee_scolaire = ? AND type = 'examen'
  `).all(ecoleId, annee) as {
    id: string
    classe_id: string
    label: string
    montant: number
    date_limite: string | null
  }[]

  const tranchesByClasse = new Map<string, typeof tranchesConfig>()
  for (const tc of tranchesConfig) {
    const list = tranchesByClasse.get(tc.classe_id) ?? []
    list.push(tc)
    tranchesByClasse.set(tc.classe_id, list)
  }

  const examByClasse = new Map<string, typeof examConfigs[0]>()
  for (const fa of examConfigs) {
    examByClasse.set(fa.classe_id, fa)
  }

  const paiements = db.prepare(`
    SELECT id, eleve_id, tranche_numero, frais_annexe_id, montant, date_paiement, mode_paiement, recu_numero
    FROM paiements
    WHERE ecole_id = ?
    ORDER BY date_paiement DESC, created_at DESC
  `).all(ecoleId) as PaiementHistorique[]

  const paiementsByEleveTranche = new Map<string, PaiementHistorique[]>()
  const paiementsByEleveFrais = new Map<string, PaiementHistorique[]>()

  for (const p of paiements) {
    if (p.tranche_numero != null) {
      const key = `${p.eleve_id}:${p.tranche_numero}`
      const list = paiementsByEleveTranche.get(key) ?? []
      list.push(p)
      paiementsByEleveTranche.set(key, list)
    }
    if (p.frais_annexe_id) {
      const key = `${p.eleve_id}:${p.frais_annexe_id}`
      const list = paiementsByEleveFrais.get(key) ?? []
      list.push(p)
      paiementsByEleveFrais.set(key, list)
    }
  }

  const allSituations: EleveSituation[] = eleves.map(eleve => {
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

    const examConfig = eleve.classe_id ? examByClasse.get(eleve.classe_id) : undefined
    let frais_examen: FraisExamenLine | null = null

    if (examConfig) {
      const historique = paiementsByEleveFrais.get(`${eleve.eleve_id}:${examConfig.id}`) ?? []
      const montant_paye = historique.reduce((s, h) => s + h.montant, 0)
      const montant_attendu = examConfig.montant
      const reste = Math.max(0, montant_attendu - montant_paye)

      frais_examen = {
        frais_annexe_id: examConfig.id,
        label: examConfig.label,
        montant_attendu,
        montant_paye,
        reste,
        date_limite: examConfig.date_limite,
        statut: trancheStatut(montant_attendu, montant_paye),
        historique,
      }
    }

    const total_attendu =
      tranches.reduce((s, t) => s + t.montant_attendu, 0) +
      (frais_examen?.montant_attendu ?? 0)
    const total_paye =
      tranches.reduce((s, t) => s + t.montant_paye, 0) +
      (frais_examen?.montant_paye ?? 0)
    const total_reste =
      tranches.reduce((s, t) => s + t.reste, 0) +
      (frais_examen?.reste ?? 0)

    return {
      ...eleve,
      total_attendu,
      total_paye,
      total_reste,
      statut: eleveStatut(tranches, frais_examen),
      tranches,
      frais_examen,
    }
  })

  let situations = allSituations
  if (options?.statut && options.statut !== 'tous') {
    situations = allSituations.filter(s => s.statut === options.statut)
  }

  return { situations, annee_scolaire: annee }
}

export function getEleveSituation(
  db: Database.Database,
  ecoleId: string,
  eleveId: string,
): EleveSituation | null {
  const { situations } = getElevesSituation(db, ecoleId)
  return situations.find(s => s.eleve_id === eleveId) ?? null
}

/** SQL fragment : total attendu (tranches + frais examen) pour jointures élèves */
export function sqlTotalAttenduEleve(anneeParam = '?'): string {
  return `(
    COALESCE((
      SELECT SUM(tc.montant_attendu) FROM tranches_config tc
      WHERE tc.classe_id = e.classe_id AND tc.annee_scolaire = ${anneeParam}
    ), 0)
    + COALESCE((
      SELECT fa.montant FROM frais_annexes fa
      WHERE fa.classe_id = e.classe_id AND fa.annee_scolaire = ${anneeParam} AND fa.type = 'examen'
    ), 0)
  )`
}
