import type Database from 'better-sqlite3'
import { getActiveAnneeScolaire } from './db-server'
import { getElevesSituation } from './paiements-utils'
import { sqlTotalAttenduEleve } from './paiements-utils'

export interface CloudClassRow {
  local_id: string
  nom: string
  section: string | null
  niveau: string | null
  annee_scolaire: string | null
  capacite_max: number | null
  nb_eleves: number
  enseignant_nom: string | null
}

export interface CloudEleveRow {
  local_id: string
  numero_matricule: string | null
  nom: string
  prenom: string
  sexe: string | null
  section: string | null
  statut: string
  classe_local_id: string | null
  classe_nom: string | null
  date_naissance: string | null
  parent_nom: string | null
  parent_telephone: string | null
  total_paye: number
  total_attendu: number
}

export interface CloudPaymentSummaryRow {
  eleve_local_id: string
  numero_matricule: string | null
  nom: string
  prenom: string
  classe_local_id: string | null
  classe_nom: string | null
  total_attendu: number
  total_paye: number
  total_reste: number
  statut: string
}

export interface CloudDashboardStats {
  totalEleves: number
  totalClasses: number
  totalPersonnel: number
  totalMois: number
  totalMoisPrecedent: number
  impayes: number
  classesVides: number
  classesSansEnseignant: number
  capaciteMoyenne: number
  classesPaiement: { classe: string; effectif: number; payes: number; pct: number }[]
  derniersPaiements: {
    montant: number
    date_paiement: string
    mode_paiement: string
    eleve_id: string
    eleve_nom: string
    eleve_prenom: string
    numero_matricule: string
    classe_nom: string | null
  }[]
}

export interface SchoolSyncPayload {
  ecole_slug: string
  ecole_nom: string
  cle_licence: string
  machine_fingerprint: string
  annee_scolaire: string
  classes: CloudClassRow[]
  eleves: CloudEleveRow[]
  payment_summaries: CloudPaymentSummaryRow[]
  dashboard_stats: CloudDashboardStats
}

export function buildSchoolSyncPayload(
  db: Database.Database,
  ecoleId: string,
  ecoleSlug: string,
  ecoleNom: string,
  cleLicence: string,
  machineFingerprint: string,
): SchoolSyncPayload {
  const annee = getActiveAnneeScolaire(db, ecoleId)
  const totalAttenduSql = sqlTotalAttenduEleve('?')

  const classes = db.prepare(`
    SELECT
      c.id as local_id,
      c.nom,
      c.section,
      c.niveau,
      c.annee_scolaire,
      c.capacite_max,
      COUNT(e.id) as nb_eleves,
      TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) as enseignant_nom
    FROM classes c
    LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
    LEFT JOIN personnel p ON p.id = c.personnel_id
    WHERE c.ecole_id = ?
    GROUP BY c.id
  `).all(ecoleId) as CloudClassRow[]

  const eleves = db.prepare(`
    SELECT
      e.id as local_id,
      e.numero_matricule,
      e.nom,
      e.prenom,
      e.sexe,
      e.section,
      e.statut,
      e.classe_id as classe_local_id,
      c.nom as classe_nom,
      e.date_naissance,
      par.nom as parent_nom,
      par.telephone as parent_telephone,
      COALESCE((SELECT SUM(pa.montant) FROM paiements pa WHERE pa.eleve_id = e.id), 0) as total_paye,
      ${totalAttenduSql} as total_attendu
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    LEFT JOIN parents par ON par.eleve_id = e.id AND par.est_principal = 1
    WHERE e.ecole_id = ?
  `).all(annee, annee, ecoleId) as CloudEleveRow[]

  const { situations } = getElevesSituation(db, ecoleId, { annee })

  const payment_summaries: CloudPaymentSummaryRow[] = situations.map(s => ({
    eleve_local_id: s.eleve_id,
    numero_matricule: s.numero_matricule,
    nom: s.nom,
    prenom: s.prenom,
    classe_local_id: s.classe_id,
    classe_nom: s.classe_nom,
    total_attendu: s.total_attendu,
    total_paye: s.total_paye,
    total_reste: s.total_reste,
    statut: s.statut,
  }))

  const dashboard_stats = buildDashboardStats(db, ecoleId, situations)

  return {
    ecole_slug: ecoleSlug,
    ecole_nom: ecoleNom,
    cle_licence: cleLicence,
    machine_fingerprint: machineFingerprint,
    annee_scolaire: annee,
    classes,
    eleves,
    payment_summaries,
    dashboard_stats,
  }
}

function buildDashboardStats(
  db: Database.Database,
  ecoleId: string,
  situations: ReturnType<typeof getElevesSituation>['situations'],
): CloudDashboardStats {
  const totalEleves = (db.prepare(
    "SELECT COUNT(*) as count FROM eleves WHERE ecole_id = ? AND statut = 'actif'"
  ).get(ecoleId) as { count: number })?.count ?? 0

  const totalClasses = (db.prepare(
    'SELECT COUNT(*) as count FROM classes WHERE ecole_id = ?'
  ).get(ecoleId) as { count: number })?.count ?? 0

  const totalPersonnel = (db.prepare(
    'SELECT COUNT(*) as count FROM personnel WHERE ecole_id = ?'
  ).get(ecoleId) as { count: number })?.count ?? 0

  const debutMois = new Date()
  debutMois.setDate(1)
  const totalMois = (db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total FROM paiements
    WHERE ecole_id = ? AND date_paiement >= ?
  `).get(ecoleId, debutMois.toISOString().split('T')[0]) as { total: number })?.total ?? 0

  const debutMoisPrecedent = new Date(debutMois)
  debutMoisPrecedent.setMonth(debutMoisPrecedent.getMonth() - 1)
  const finMoisPrecedent = new Date(debutMois)
  finMoisPrecedent.setDate(0)
  const totalMoisPrecedent = (db.prepare(`
    SELECT COALESCE(SUM(montant), 0) as total FROM paiements
    WHERE ecole_id = ? AND date_paiement >= ? AND date_paiement <= ?
  `).get(
    ecoleId,
    debutMoisPrecedent.toISOString().split('T')[0],
    finMoisPrecedent.toISOString().split('T')[0],
  ) as { total: number })?.total ?? 0

  const classesVides = (db.prepare(`
    SELECT COUNT(*) as count FROM classes c WHERE c.ecole_id = ?
    AND (SELECT COUNT(*) FROM eleves e WHERE e.classe_id = c.id AND e.statut = 'actif') = 0
  `).get(ecoleId) as { count: number })?.count ?? 0

  const impayes = situations.filter(s => s.statut === 'impaye' || s.statut === 'partiel').length

  const classesSansEnseignant = (db.prepare(`
    SELECT COUNT(*) as count FROM classes
    WHERE ecole_id = ? AND (personnel_id IS NULL OR personnel_id = '')
  `).get(ecoleId) as { count: number })?.count ?? 0

  const classesPaiementMap = new Map<string, { classe: string; effectif: number; payes: number }>()
  for (const s of situations) {
    if (!s.classe_id || s.statut === 'non_configure') continue
    const entry = classesPaiementMap.get(s.classe_id) ?? { classe: s.classe_nom ?? '—', effectif: 0, payes: 0 }
    entry.effectif += 1
    if (s.statut === 'paye') entry.payes += 1
    classesPaiementMap.set(s.classe_id, entry)
  }

  const classesPaiement = Array.from(classesPaiementMap.values())
    .map(c => ({ ...c, pct: c.effectif > 0 ? Math.round((c.payes / c.effectif) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct)

  const capaciteMoyenne = totalClasses > 0
    ? Math.round((db.prepare('SELECT COALESCE(AVG(capacite_max), 60) as avg FROM classes WHERE ecole_id = ?').get(ecoleId) as { avg: number }).avg)
    : 60

  const derniersPaiements = db.prepare(`
    SELECT p.montant, p.date_paiement, p.mode_paiement,
           e.id as eleve_id, e.nom as eleve_nom, e.prenom as eleve_prenom,
           e.numero_matricule,
           c.nom as classe_nom
    FROM paiements p
    JOIN eleves e ON e.id = p.eleve_id
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE p.ecole_id = ?
    ORDER BY p.created_at DESC LIMIT 5
  `).all(ecoleId) as CloudDashboardStats['derniersPaiements']

  return {
    totalEleves,
    totalClasses,
    totalPersonnel,
    totalMois,
    totalMoisPrecedent,
    impayes,
    classesVides,
    classesSansEnseignant,
    capaciteMoyenne,
    classesPaiement,
    derniersPaiements,
  }
}
