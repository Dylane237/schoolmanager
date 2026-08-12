import 'server-only'
import type Database from 'better-sqlite3'
import { upsertSchoolDataOnCloud, shouldSkipStructuredRegression } from './cloud-data-store'
import { tryLoadBufferIntoMemoryDb } from './db-vercel'
import { getMachineFingerprint } from './paths'
import { recordSyncEvent } from './sync-monitor'
import { buildSchoolSyncPayload } from './sync-payload'

export type StructuredSyncResult = {
  ok: boolean
  error?: string
  counts?: { eleves: number; classes: number; eleves_actif: number }
}

function readLicenceForEcole(
  db: Database.Database,
  ecoleId: string,
): { cle_licence: string; machine_fingerprint: string | null } | null {
  const row = db.prepare(`
    SELECT cle_licence, machine_fingerprint FROM licences
    WHERE ecole_id = ? AND is_active = 1
    ORDER BY date_fin DESC
    LIMIT 1
  `).get(ecoleId) as { cle_licence: string; machine_fingerprint: string | null } | undefined

  if (!row?.cle_licence) return null
  return row
}

/** Dérive cloud_eleves / cloud_classes depuis une base SQLite ouverte. */
export async function syncStructuredFromEcoleDb(
  db: Database.Database,
  ecoleSlug: string,
): Promise<StructuredSyncResult> {
  const slug = ecoleSlug.trim()
  if (!slug) return { ok: false, error: 'Slug école requis' }

  const ecole = db.prepare('SELECT id, nom FROM ecoles WHERE slug = ?').get(slug) as {
    id: string
    nom: string
  } | undefined

  if (!ecole?.id) return { ok: false, error: `École "${slug}" absente de la base` }

  const licence = readLicenceForEcole(db, ecole.id)
  if (!licence) return { ok: false, error: `Licence active absente pour "${slug}"` }

  const payload = buildSchoolSyncPayload(
    db,
    ecole.id,
    slug,
    ecole.nom,
    licence.cle_licence,
    licence.machine_fingerprint || getMachineFingerprint(),
  )

  if (await shouldSkipStructuredRegression(slug, payload.eleves.length)) {
    return {
      ok: false,
      error: `Sync structurée refusée pour "${slug}": blob sans élèves alors que le cloud en contient déjà`,
    }
  }

  const result = await upsertSchoolDataOnCloud(payload)
  if (!result.ok) return { ok: false, error: result.error }

  const elevesActif = payload.eleves.filter(e => e.statut === 'actif').length
  return {
    ok: true,
    counts: {
      eleves: payload.eleves.length,
      classes: payload.classes.length,
      eleves_actif: elevesActif,
    },
  }
}

/** Dérive les tables structurées Supabase depuis le même buffer blob uploadé. */
export async function syncStructuredFromBuffer(
  ecoleSlug: string,
  buffer: Buffer,
): Promise<StructuredSyncResult> {
  if (!buffer.length) return { ok: false, error: 'Buffer blob vide' }

  const db = tryLoadBufferIntoMemoryDb(buffer)
  if (!db) return { ok: false, error: `Blob SQLite illisible pour "${ecoleSlug}"` }

  try {
    return await syncStructuredFromEcoleDb(db, ecoleSlug)
  } finally {
    db.close()
  }
}

/** Compte les élèves dans un buffer SQLite (garde-fou avant upload blob). */
export function countElevesInBuffer(buffer: Buffer, ecoleSlug: string): number | null {
  const db = tryLoadBufferIntoMemoryDb(buffer)
  if (!db) return null
  try {
    const ecole = db.prepare('SELECT id FROM ecoles WHERE slug = ?').get(ecoleSlug) as { id: string } | undefined
    if (!ecole) return 0
    const row = db.prepare('SELECT COUNT(*) as n FROM eleves WHERE ecole_id = ?').get(ecole.id) as { n: number }
    return row.n
  } finally {
    db.close()
  }
}

/** Refuse d'uploader un blob vide par-dessus un cloud qui contient déjà des élèves. */
export async function shouldSkipBlobRegression(
  ecoleSlug: string,
  buffer: Buffer,
): Promise<boolean> {
  const incoming = countElevesInBuffer(buffer, ecoleSlug)
  if (incoming === null || incoming > 0) return false

  const { fetchCloudDbMeta } = await import('./db-blob-sync')
  const meta = await fetchCloudDbMeta(ecoleSlug)
  if (!meta) return false

  const { getSupabaseAdmin, isSupabaseConfigured } = await import('./supabase-admin')
  if (!isSupabaseConfigured()) return false

  const { count } = await getSupabaseAdmin()!
    .from('cloud_eleves')
    .select('*', { count: 'exact', head: true })
    .eq('ecole_slug', ecoleSlug)

  return (count ?? 0) > 0
}

/** Flush structuré + journalisation (appelé après upload blob réussi). */
export async function syncStructuredAfterBlobUpload(
  ecoleSlug: string,
  buffer: Buffer,
): Promise<StructuredSyncResult> {
  let result = await syncStructuredFromBuffer(ecoleSlug, buffer)

  if (!result.ok && result.error?.includes('illisible')) {
    try {
      const { getDbForSlug } = await import('./db')
      const db = getDbForSlug(ecoleSlug)
      result = await syncStructuredFromEcoleDb(db, ecoleSlug)
    } catch {
      /* conserver l'erreur blob */
    }
  }

  if (result.ok) {
    const detail = result.counts
      ? `${result.counts.eleves} élèves, ${result.counts.classes} classes`
      : undefined
    recordSyncEvent(ecoleSlug, 'push_ok', detail ? `structured: ${detail}` : 'structured ok')
  } else {
    recordSyncEvent(ecoleSlug, 'push_fail', result.error ?? 'structured sync failed')
  }
  return result
}
