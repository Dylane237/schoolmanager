import 'server-only'
import type Database from 'better-sqlite3'
import { isSupabaseConfigured } from './supabase-admin'
import { persistSchoolChanges } from './school-db'
import { pushSchoolDataFromEcoleIdAsync } from './sync-trigger'
import { applyBlobMergeDecision, isBlobEntityType } from './sync-merge-blob'
import { openCloudSnapshotDb, resolveEcoleIdFromDb } from './sync-snapshot'
import type { SyncDiffKind } from './sync-diff-types'
import type { SyncEntityType } from './sync-changelog'

export type MergeChoice = 'local' | 'cloud' | 'skip'

export type MergeDecision = {
  entity_type: SyncEntityType
  entity_id: string
  choice: MergeChoice
}

async function applyCloudEleveToLocal(
  db: Database.Database,
  ecoleId: string,
  ecoleSlug: string,
  entityId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return 'Supabase non configuré'

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const { data, error } = await getSupabaseAdmin()!
    .from('cloud_eleves')
    .select('*')
    .eq('ecole_slug', ecoleSlug)
    .eq('local_id', entityId)
    .maybeSingle()

  if (error || !data) return 'Élève cloud introuvable'

  if (data.classe_local_id) {
    const classe = db.prepare(
      'SELECT id FROM classes WHERE id = ? AND ecole_id = ?',
    ).get(data.classe_local_id, ecoleId)
    if (!classe) {
      const cloudClasse = await getSupabaseAdmin()!
        .from('cloud_classes')
        .select('*')
        .eq('ecole_slug', ecoleSlug)
        .eq('local_id', data.classe_local_id)
        .maybeSingle()
      if (cloudClasse.data) {
        db.prepare(`
          INSERT OR IGNORE INTO classes (id, ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          cloudClasse.data.local_id,
          ecoleId,
          cloudClasse.data.nom,
          cloudClasse.data.section,
          cloudClasse.data.niveau,
          cloudClasse.data.annee_scolaire,
          cloudClasse.data.capacite_max ?? 60,
        )
      }
    }
  }

  const existing = db.prepare('SELECT id FROM eleves WHERE id = ?').get(entityId)
  if (existing) {
    db.prepare(`
      UPDATE eleves SET
        nom = ?, prenom = ?, sexe = ?, section = ?, statut = ?,
        classe_id = ?, numero_matricule = ?, date_naissance = ?
      WHERE id = ? AND ecole_id = ?
    `).run(
      data.nom, data.prenom, data.sexe, data.section, data.statut ?? 'actif',
      data.classe_local_id, data.numero_matricule, data.date_naissance,
      entityId, ecoleId,
    )
  } else {
    db.prepare(`
      INSERT INTO eleves (
        id, ecole_id, classe_id, numero_matricule, nom, prenom,
        sexe, section, statut, date_naissance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entityId, ecoleId, data.classe_local_id, data.numero_matricule,
      data.nom, data.prenom, data.sexe, data.section, data.statut ?? 'actif',
      data.date_naissance,
    )
  }

  if (data.parent_nom && data.parent_telephone) {
    db.prepare('DELETE FROM parents WHERE eleve_id = ?').run(entityId)
    db.prepare(`
      INSERT INTO parents (eleve_id, nom, telephone, lien, est_principal)
      VALUES (?, ?, ?, 'tuteur', 1)
    `).run(entityId, data.parent_nom, data.parent_telephone)
  }

  return null
}

async function applyLocalEleveToCloud(
  db: Database.Database,
  ecoleId: string,
  ecoleSlug: string,
  entityId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return 'Supabase non configuré'

  const row = db.prepare(`
    SELECT
      e.id, e.numero_matricule, e.nom, e.prenom, e.sexe, e.section, e.statut,
      e.classe_id, c.nom as classe_nom, e.date_naissance,
      p.nom as parent_nom, p.telephone as parent_telephone,
      COALESCE((SELECT SUM(pa.montant) FROM paiements pa WHERE pa.eleve_id = e.id), 0) as total_paye
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    LEFT JOIN parents p ON p.eleve_id = e.id AND p.est_principal = 1
    WHERE e.id = ? AND e.ecole_id = ?
  `).get(entityId, ecoleId) as Record<string, unknown> | undefined

  if (!row) return 'Élève local introuvable'

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const { sqlTotalAttenduEleve } = await import('./paiements-utils')
  const { getActiveAnneeScolaire } = await import('./db-server')
  const annee = getActiveAnneeScolaire(db, ecoleId)
  const totalAttenduSql = sqlTotalAttenduEleve('?')
  const totalRow = db.prepare(
    `SELECT ${totalAttenduSql} as total_attendu FROM eleves e WHERE e.id = ?`,
  ).get(annee, annee, entityId) as { total_attendu: number } | undefined
  const totalAttendu = totalRow?.total_attendu ?? 0

  const now = new Date().toISOString()
  const { error } = await getSupabaseAdmin()!
    .from('cloud_eleves')
    .upsert({
      ecole_slug: ecoleSlug,
      local_id: entityId,
      numero_matricule: row.numero_matricule as string | null,
      nom: row.nom as string,
      prenom: row.prenom as string,
      sexe: row.sexe as string | null,
      section: row.section as string | null,
      statut: row.statut as string,
      classe_local_id: row.classe_id as string | null,
      classe_nom: row.classe_nom as string | null,
      date_naissance: row.date_naissance as string | null,
      parent_nom: row.parent_nom as string | null,
      parent_telephone: row.parent_telephone as string | null,
      total_paye: Number(row.total_paye ?? 0),
      total_attendu: totalAttendu,
      synced_at: now,
    }, { onConflict: 'ecole_slug,local_id' })

  return error?.message ?? null
}

async function applyCloudClasseToLocal(
  db: Database.Database,
  ecoleId: string,
  ecoleSlug: string,
  entityId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return 'Supabase non configuré'

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const { data, error } = await getSupabaseAdmin()!
    .from('cloud_classes')
    .select('*')
    .eq('ecole_slug', ecoleSlug)
    .eq('local_id', entityId)
    .maybeSingle()

  if (error || !data) return 'Classe cloud introuvable'

  db.prepare(`
    INSERT OR REPLACE INTO classes (id, ecole_id, nom, section, niveau, annee_scolaire, capacite_max)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entityId, ecoleId, data.nom, data.section, data.niveau,
    data.annee_scolaire, data.capacite_max ?? 60,
  )

  return null
}

async function applyLocalClasseToCloud(
  db: Database.Database,
  ecoleId: string,
  ecoleSlug: string,
  entityId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return 'Supabase non configuré'

  const row = db.prepare(`
    SELECT c.id, c.nom, c.section, c.niveau, c.annee_scolaire, c.capacite_max,
      COUNT(e.id) as nb_eleves,
      TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) as enseignant_nom
    FROM classes c
    LEFT JOIN eleves e ON e.classe_id = c.id AND e.statut = 'actif'
    LEFT JOIN personnel p ON p.id = c.personnel_id
    WHERE c.id = ? AND c.ecole_id = ?
    GROUP BY c.id
  `).get(entityId, ecoleId) as Record<string, unknown> | undefined

  if (!row) return 'Classe locale introuvable'

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const now = new Date().toISOString()
  const { error } = await getSupabaseAdmin()!
    .from('cloud_classes')
    .upsert({
      ecole_slug: ecoleSlug,
      local_id: entityId,
      nom: row.nom as string,
      section: row.section as string | null,
      niveau: row.niveau as string | null,
      annee_scolaire: row.annee_scolaire as string | null,
      capacite_max: row.capacite_max as number | null,
      nb_eleves: Number(row.nb_eleves ?? 0),
      enseignant_nom: row.enseignant_nom as string | null,
      synced_at: now,
    }, { onConflict: 'ecole_slug,local_id' })

  return error?.message ?? null
}

function removeLocalEleve(db: Database.Database, ecoleId: string, entityId: string): void {
  db.prepare('UPDATE eleves SET statut = ? WHERE id = ? AND ecole_id = ?').run('inactif', entityId, ecoleId)
}

function removeLocalClasse(db: Database.Database, ecoleId: string, entityId: string): void {
  db.prepare('DELETE FROM classes WHERE id = ? AND ecole_id = ?').run(entityId, ecoleId)
}

export async function applyMergeDecisions(
  db: Database.Database,
  ecoleId: string,
  ecoleSlug: string,
  decisions: MergeDecision[],
  kindByKey?: Map<string, SyncDiffKind>,
): Promise<{ applied: number; skipped: number; errors: string[] }> {
  let applied = 0
  let skipped = 0
  const errors: string[] = []

  if (!kindByKey) {
    const { computeSyncDiff } = await import('./sync-diff')
    const diff = await computeSyncDiff(db, ecoleId, ecoleSlug)
    kindByKey = new Map(diff.items.map(i => [`${i.entity_type}:${i.entity_id}`, i.kind]))
  }

  const cloudDb = await openCloudSnapshotDb(ecoleSlug)
  const cloudEcoleId = cloudDb ? resolveEcoleIdFromDb(cloudDb, ecoleSlug) : null

  try {
    for (const d of decisions) {
      if (d.choice === 'skip') {
        skipped += 1
        continue
      }

      const kind = kindByKey.get(`${d.entity_type}:${d.entity_id}`)
      if (!kind) {
        // Entrée déjà résolue ou diff rafraîchi entre-temps — ignorer sans erreur
        skipped += 1
        continue
      }

      let err: string | null = null

      if (isBlobEntityType(d.entity_type)) {
        err = await applyBlobMergeDecision(
          db, cloudDb, ecoleId, cloudEcoleId,
          d.entity_type, d.entity_id, d.choice, kind,
        )
      } else if (d.entity_type === 'eleve') {
        if (d.choice === 'cloud') {
          if (kind === 'local_only') removeLocalEleve(db, ecoleId, d.entity_id)
          else err = await applyCloudEleveToLocal(db, ecoleId, ecoleSlug, d.entity_id)
        } else if (d.choice === 'local') {
          if (kind !== 'cloud_only') err = await applyLocalEleveToCloud(db, ecoleId, ecoleSlug, d.entity_id)
        }
      } else if (d.entity_type === 'classe') {
        if (d.choice === 'cloud') {
          if (kind === 'local_only') removeLocalClasse(db, ecoleId, d.entity_id)
          else err = await applyCloudClasseToLocal(db, ecoleId, ecoleSlug, d.entity_id)
        } else if (d.choice === 'local') {
          if (kind !== 'cloud_only') err = await applyLocalClasseToCloud(db, ecoleId, ecoleSlug, d.entity_id)
        }
      } else {
        err = `Type "${d.entity_type}" non supporté pour le merge granulaire`
      }

      if (err) errors.push(`${d.entity_type}/${d.entity_id}: ${err}`)
      else applied += 1
    }
  } finally {
    cloudDb?.close()
  }

  if (applied > 0) {
    await persistSchoolChanges(ecoleSlug)
    await pushSchoolDataFromEcoleIdAsync(ecoleId, ecoleSlug)
  }

  return { applied, skipped, errors }
}
