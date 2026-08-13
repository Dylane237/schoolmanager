import 'server-only'
import type Database from 'better-sqlite3'
import type { SyncDiffItem } from './sync-diff-types'

const ECOLE_FIELDS = [
  'nom', 'telephone', 'adresse', 'email', 'directeur_nom',
  'logo_url', 'entete_url', 'nom_caissier', 'sections',
] as const

function diffFields(
  local: Record<string, string | null>,
  cloud: Record<string, string | null>,
  keys: string[],
): string[] {
  return keys.filter(k => (local[k] ?? '') !== (cloud[k] ?? ''))
}

function diffTableById<T extends { id: string }>(
  entity_type: SyncDiffItem['entity_type'],
  local: Map<string, T>,
  cloud: Map<string, T>,
  labelFn: (row: T) => string,
  summaryFn: (row: T) => string,
  compareFn: (l: T, c: T) => string[],
): SyncDiffItem[] {
  const items: SyncDiffItem[] = []
  const ids = new Set([...local.keys(), ...cloud.keys()])

  for (const id of ids) {
    const l = local.get(id)
    const c = cloud.get(id)

    if (l && !c) {
      items.push({
        entity_type, entity_id: id, label: labelFn(l), kind: 'local_only',
        local_summary: summaryFn(l), cloud_summary: null, fields_changed: [],
      })
      continue
    }
    if (c && !l) {
      items.push({
        entity_type, entity_id: id, label: labelFn(c), kind: 'cloud_only',
        local_summary: null, cloud_summary: summaryFn(c), fields_changed: [],
      })
      continue
    }
    if (!l || !c) continue

    const changed = compareFn(l, c)
    if (changed.length > 0) {
      items.push({
        entity_type, entity_id: id, label: labelFn(l), kind: 'both_modified',
        local_summary: summaryFn(l), cloud_summary: summaryFn(c), fields_changed: changed,
      })
    }
  }

  return items
}

type AnnonceRow = {
  id: string
  titre: string
  contenu: string
  cible: string | null
  priorite: string | null
  is_active: number
}

type AnneeRow = {
  id: string
  label: string
  date_debut: string | null
  date_fin: string | null
  is_active: number
}

type UserRow = {
  id: string
  nom: string | null
  prenom: string | null
  email: string
  role: string | null
  telephone: string | null
}

type CompetenceRow = {
  id: string
  eleve_label: string
  periode: string
  domaine: string
  competence: string
  statut: string | null
}

/** Paramètres école, années, annonces, utilisateurs, maternelle. */
export function diffSettingsEntities(
  localDb: Database.Database,
  cloudDb: Database.Database,
  ecoleId: string,
  cloudEcoleId: string,
): SyncDiffItem[] {
  const items: SyncDiffItem[] = []

  const localEcole = localDb.prepare(
    `SELECT ${ECOLE_FIELDS.join(', ')} FROM ecoles WHERE id = ?`,
  ).get(ecoleId) as Record<string, string | null> | undefined

  const cloudEcole = cloudDb.prepare(
    `SELECT ${ECOLE_FIELDS.join(', ')} FROM ecoles WHERE id = ?`,
  ).get(cloudEcoleId) as Record<string, string | null> | undefined

  if (localEcole && cloudEcole) {
    const changed = diffFields(localEcole, cloudEcole, [...ECOLE_FIELDS])
    if (changed.length > 0) {
      items.push({
        entity_type: 'parametre_ecole',
        entity_id: ecoleId,
        label: `Paramètres école — ${localEcole.nom ?? 'École'}`,
        kind: 'both_modified',
        local_summary: `${localEcole.nom ?? '—'} · ${localEcole.telephone ?? '—'}`,
        cloud_summary: `${cloudEcole.nom ?? '—'} · ${cloudEcole.telephone ?? '—'}`,
        fields_changed: changed,
      })
    }
  }

  const localPm = localDb.prepare(
    'SELECT valeur FROM parametres_maternelle WHERE ecole_id = ?',
  ).get(ecoleId) as { valeur: string } | undefined
  const cloudPm = cloudDb.prepare(
    'SELECT valeur FROM parametres_maternelle WHERE ecole_id = ?',
  ).get(cloudEcoleId) as { valeur: string } | undefined

  const localVal = localPm?.valeur ?? '[]'
  const cloudVal = cloudPm?.valeur ?? '[]'
  if (localVal !== cloudVal) {
    if (localPm && !cloudPm) {
      items.push({
        entity_type: 'parametre_maternelle',
        entity_id: ecoleId,
        label: 'Paramètres maternelle',
        kind: 'local_only',
        local_summary: 'Configuré localement',
        cloud_summary: null,
        fields_changed: [],
      })
    } else if (cloudPm && !localPm) {
      items.push({
        entity_type: 'parametre_maternelle',
        entity_id: ecoleId,
        label: 'Paramètres maternelle',
        kind: 'cloud_only',
        local_summary: null,
        cloud_summary: 'Configuré sur le cloud',
        fields_changed: [],
      })
    } else {
      items.push({
        entity_type: 'parametre_maternelle',
        entity_id: ecoleId,
        label: 'Paramètres maternelle',
        kind: 'both_modified',
        local_summary: 'Version locale',
        cloud_summary: 'Version cloud',
        fields_changed: ['valeur'],
      })
    }
  }

  const readAnnees = (db: Database.Database, id: string) => {
    const rows = db.prepare(
      'SELECT id, label, date_debut, date_fin, is_active FROM annees_scolaires WHERE ecole_id = ?',
    ).all(id) as AnneeRow[]
    return new Map(rows.map(r => [r.id, r]))
  }

  items.push(...diffTableById(
    'annee_scolaire',
    readAnnees(localDb, ecoleId),
    readAnnees(cloudDb, cloudEcoleId),
    a => `Année ${a.label}${a.is_active ? ' (active)' : ''}`,
    a => `${a.date_debut ?? '?'} → ${a.date_fin ?? '?'}`,
    (l, c) => diffFields(
      {
        label: l.label,
        debut: l.date_debut,
        fin: l.date_fin,
        active: String(l.is_active),
      },
      {
        label: c.label,
        debut: c.date_debut,
        fin: c.date_fin,
        active: String(c.is_active),
      },
      ['label', 'debut', 'fin', 'active'],
    ),
  ))

  const readAnnonces = (db: Database.Database, id: string) => {
    const rows = db.prepare(
      'SELECT id, titre, contenu, cible, priorite, is_active FROM annonces WHERE ecole_id = ?',
    ).all(id) as AnnonceRow[]
    return new Map(rows.map(r => [r.id, r]))
  }

  items.push(...diffTableById(
    'annonce',
    readAnnonces(localDb, ecoleId),
    readAnnonces(cloudDb, cloudEcoleId),
    a => `Annonce — ${a.titre}`,
    a => `${a.priorite ?? 'normale'} · ${a.is_active ? 'active' : 'inactive'}`,
    (l, c) => diffFields(
      { titre: l.titre, contenu: l.contenu, cible: l.cible, priorite: l.priorite, active: String(l.is_active) },
      { titre: c.titre, contenu: c.contenu, cible: c.cible, priorite: c.priorite, active: String(c.is_active) },
      ['titre', 'contenu', 'cible', 'priorite', 'active'],
    ),
  ))

  const readUsers = (db: Database.Database, id: string) => {
    const rows = db.prepare(`
      SELECT id, nom, prenom, email, role, telephone FROM users
      WHERE ecole_id = ? AND role != 'super_admin'
    `).all(id) as UserRow[]
    return new Map(rows.map(r => [r.id, r]))
  }

  items.push(...diffTableById(
    'utilisateur',
    readUsers(localDb, ecoleId),
    readUsers(cloudDb, cloudEcoleId),
    u => `Utilisateur ${u.prenom ? `${u.prenom} ` : ''}${u.nom ?? u.email}`,
    u => `${u.role ?? '?'} · ${u.email}`,
    (l, c) => diffFields(
      { nom: l.nom, prenom: l.prenom, email: l.email, role: l.role, tel: l.telephone },
      { nom: c.nom, prenom: c.prenom, email: c.email, role: c.role, tel: c.telephone },
      ['nom', 'prenom', 'email', 'role', 'tel'],
    ),
  ))

  const readCompetences = (db: Database.Database, id: string) => {
    const rows = db.prepare(`
      SELECT cm.id, cm.periode, cm.domaine, cm.competence, cm.statut,
        TRIM(COALESCE(e.prenom, '') || ' ' || COALESCE(e.nom, '')) as eleve_label
      FROM competences_maternelle cm
      LEFT JOIN eleves e ON e.id = cm.eleve_id
      WHERE cm.ecole_id = ?
    `).all(id) as CompetenceRow[]
    return new Map(rows.map(r => [r.id, r]))
  }

  items.push(...diffTableById(
    'competence',
    readCompetences(localDb, ecoleId),
    readCompetences(cloudDb, cloudEcoleId),
    c => `Compétence ${c.eleve_label} — ${c.competence}`,
    c => `${c.statut ?? '?'} · ${c.periode}`,
    (l, c) => diffFields(
      { statut: l.statut, periode: l.periode, domaine: l.domaine, competence: l.competence },
      { statut: c.statut, periode: c.periode, domaine: c.domaine, competence: c.competence },
      ['statut', 'periode', 'domaine', 'competence'],
    ),
  ))

  return items
}
