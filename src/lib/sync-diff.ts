import 'server-only'
import type Database from 'better-sqlite3'
import { fetchCloudClasses } from './cloud-read'
import { getPendingLocalChanges, type SyncChangeEntry } from './sync-changelog'
import { isSupabaseConfigured } from './supabase-admin'
import { diffBlobEntities } from './sync-diff-blob'
import { diffSettingsEntities } from './sync-diff-settings'
import { openCloudSnapshotDb, resolveEcoleIdFromDb } from './sync-snapshot'
import type { SyncDiffItem, SyncDiffReport } from './sync-diff-types'

export type { SyncDiffItem, SyncDiffKind, SyncDiffReport } from './sync-diff-types'

type EleveRow = {
  id: string
  nom: string
  prenom: string
  classe_id: string | null
  classe_nom: string | null
  statut: string
  numero_matricule: string | null
}

type ClasseRow = {
  id: string
  nom: string
  section: string | null
  niveau: string | null
}

function eleveLabel(e: EleveRow): string {
  const mat = e.numero_matricule ? ` (${e.numero_matricule})` : ''
  const cls = e.classe_nom ? ` — ${e.classe_nom}` : ''
  return `${e.prenom} ${e.nom}${mat}${cls}`
}

function eleveSummary(e: EleveRow): string {
  return `${e.prenom} ${e.nom}${e.classe_nom ? `, classe ${e.classe_nom}` : ', sans classe'} · ${e.statut}`
}

function classeLabel(c: ClasseRow): string {
  return `${c.nom}${c.section ? ` (${c.section})` : ''}`
}

function diffFields(
  local: Record<string, string | null>,
  cloud: Record<string, string | null>,
  keys: string[],
): string[] {
  return keys.filter(k => (local[k] ?? '') !== (cloud[k] ?? ''))
}

function readLocalEleves(db: Database.Database, ecoleId: string): Map<string, EleveRow> {
  const rows = db.prepare(`
    SELECT e.id, e.nom, e.prenom, e.classe_id, c.nom as classe_nom, e.statut, e.numero_matricule
    FROM eleves e
    LEFT JOIN classes c ON c.id = e.classe_id
    WHERE e.ecole_id = ?
  `).all(ecoleId) as EleveRow[]

  return new Map(rows.map(r => [r.id, r]))
}

function readLocalClasses(db: Database.Database, ecoleId: string): Map<string, ClasseRow> {
  const rows = db.prepare(`
    SELECT id, nom, section, niveau FROM classes WHERE ecole_id = ?
  `).all(ecoleId) as ClasseRow[]

  return new Map(rows.map(r => [r.id, r]))
}

async function readCloudEleves(ecoleSlug: string): Promise<Map<string, EleveRow>> {
  if (!isSupabaseConfigured()) return new Map()

  const { getSupabaseAdmin } = await import('./supabase-admin')
  const { data } = await getSupabaseAdmin()!
    .from('cloud_eleves')
    .select('local_id, nom, prenom, classe_local_id, classe_nom, statut, numero_matricule')
    .eq('ecole_slug', ecoleSlug)

  const map = new Map<string, EleveRow>()
  for (const row of data ?? []) {
    map.set(row.local_id, {
      id: row.local_id,
      nom: row.nom,
      prenom: row.prenom,
      classe_id: row.classe_local_id,
      classe_nom: row.classe_nom,
      statut: row.statut,
      numero_matricule: row.numero_matricule,
    })
  }
  return map
}

async function readCloudClasses(ecoleSlug: string): Promise<Map<string, ClasseRow>> {
  const rows = await fetchCloudClasses(ecoleSlug)
  return new Map(rows.map(r => [r.id, {
    id: r.id,
    nom: r.nom,
    section: r.section,
    niveau: r.niveau,
  }]))
}

function diffEleves(
  local: Map<string, EleveRow>,
  cloud: Map<string, EleveRow>,
): SyncDiffItem[] {
  const items: SyncDiffItem[] = []
  const ids = new Set([...local.keys(), ...cloud.keys()])

  for (const id of ids) {
    const l = local.get(id)
    const c = cloud.get(id)

    if (l && !c) {
      items.push({
        entity_type: 'eleve',
        entity_id: id,
        label: eleveLabel(l),
        kind: 'local_only',
        local_summary: eleveSummary(l),
        cloud_summary: null,
        fields_changed: [],
      })
      continue
    }

    if (c && !l) {
      items.push({
        entity_type: 'eleve',
        entity_id: id,
        label: eleveLabel(c),
        kind: 'cloud_only',
        local_summary: null,
        cloud_summary: eleveSummary(c),
        fields_changed: [],
      })
      continue
    }

    if (!l || !c) continue

    const changed = diffFields(
      {
        nom: l.nom,
        prenom: l.prenom,
        classe: l.classe_id,
        statut: l.statut,
        matricule: l.numero_matricule,
      },
      {
        nom: c.nom,
        prenom: c.prenom,
        classe: c.classe_id,
        statut: c.statut,
        matricule: c.numero_matricule,
      },
      ['nom', 'prenom', 'classe', 'statut', 'matricule'],
    )

    if (changed.length > 0) {
      items.push({
        entity_type: 'eleve',
        entity_id: id,
        label: eleveLabel(l),
        kind: 'both_modified',
        local_summary: eleveSummary(l),
        cloud_summary: eleveSummary(c),
        fields_changed: changed,
      })
    }
  }

  return items
}

function diffClasses(
  local: Map<string, ClasseRow>,
  cloud: Map<string, ClasseRow>,
): SyncDiffItem[] {
  const items: SyncDiffItem[] = []
  const ids = new Set([...local.keys(), ...cloud.keys()])

  for (const id of ids) {
    const l = local.get(id)
    const c = cloud.get(id)

    if (l && !c) {
      items.push({
        entity_type: 'classe',
        entity_id: id,
        label: classeLabel(l),
        kind: 'local_only',
        local_summary: classeLabel(l),
        cloud_summary: null,
        fields_changed: [],
      })
      continue
    }

    if (c && !l) {
      items.push({
        entity_type: 'classe',
        entity_id: id,
        label: classeLabel(c),
        kind: 'cloud_only',
        local_summary: null,
        cloud_summary: classeLabel(c),
        fields_changed: [],
      })
      continue
    }

    if (!l || !c) continue

    const changed = diffFields(
      { nom: l.nom, section: l.section, niveau: l.niveau },
      { nom: c.nom, section: c.section, niveau: c.niveau },
      ['nom', 'section', 'niveau'],
    )

    if (changed.length > 0) {
      items.push({
        entity_type: 'classe',
        entity_id: id,
        label: classeLabel(l),
        kind: 'both_modified',
        local_summary: classeLabel(l),
        cloud_summary: classeLabel(c),
        fields_changed: changed,
      })
    }
  }

  return items
}

/** Compare la base locale aux tables structurées cloud (élèves + classes). */
export async function computeSyncDiff(
  db: Database.Database,
  ecoleId: string,
  ecoleSlug: string,
): Promise<SyncDiffReport> {
  const localEleves = readLocalEleves(db, ecoleId)
  const localClasses = readLocalClasses(db, ecoleId)
  const cloudEleves = await readCloudEleves(ecoleSlug)
  const cloudClasses = await readCloudClasses(ecoleSlug)

  const items = [
    ...diffEleves(localEleves, cloudEleves),
    ...diffClasses(localClasses, cloudClasses),
  ]

  const cloudDb = await openCloudSnapshotDb(ecoleSlug)
  if (cloudDb) {
    try {
      const cloudEcoleId = resolveEcoleIdFromDb(cloudDb, ecoleSlug)
      if (cloudEcoleId) {
        items.push(...diffBlobEntities(db, cloudDb, ecoleId, cloudEcoleId))
        items.push(...diffSettingsEntities(db, cloudDb, ecoleId, cloudEcoleId))
      }
    } finally {
      cloudDb.close()
    }
  }

  items.sort((a, b) => a.label.localeCompare(b.label, 'fr'))

  const local_pending = getPendingLocalChanges(ecoleSlug)

  return {
    has_differences: items.length > 0,
    items,
    local_pending,
    summary: {
      local_only: items.filter(i => i.kind === 'local_only').length,
      cloud_only: items.filter(i => i.kind === 'cloud_only').length,
      both_modified: items.filter(i => i.kind === 'both_modified').length,
    },
  }
}

/** Infère les changements cloud récents à partir du diff (pas de journal web persisté). */
export function cloudChangesFromDiff(items: SyncDiffItem[]): SyncChangeEntry[] {
  const now = new Date().toISOString()
  return items
    .filter(i => i.kind === 'cloud_only' || i.kind === 'both_modified')
    .map(i => ({
      at: now,
      platform: 'web' as const,
      entity_type: i.entity_type,
      entity_id: i.entity_id,
      action: i.kind === 'cloud_only' ? 'create' as const : 'update' as const,
      label: i.cloud_summary ?? i.label,
      source: i.kind === 'cloud_only' ? 'cloud-only' : `cloud-modified:${i.fields_changed.join(',')}`,
    }))
}
