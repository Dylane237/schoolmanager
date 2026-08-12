import { getDb } from './db-server'
import { isSupabaseConfigured } from './supabase-admin'
import { recordSyncEvent } from './sync-monitor'
import { syncStructuredFromEcoleDb } from './structured-sync'

/** Sync des données structurées école → cloud (await). */
export async function pushSchoolDataFromEcoleIdAsync(
  ecoleId: string,
  ecoleSlug?: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return

  try {
    const db = getDb(ecoleSlug)
    const ecole = db.prepare(
      'SELECT nom, slug FROM ecoles WHERE id = ?',
    ).get(ecoleId) as { nom: string; slug: string } | undefined

    if (!ecole?.slug) return

    const result = await syncStructuredFromEcoleDb(db, ecole.slug)
    if (result.ok) {
      const detail = result.counts
        ? `${result.counts.eleves} élèves, ${result.counts.classes} classes`
        : undefined
      recordSyncEvent(ecole.slug, 'push_ok', detail ? `structured: ${detail}` : 'structured ok')
    } else {
      recordSyncEvent(ecole.slug, 'push_fail', result.error ?? 'structured sync failed')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'structured sync error'
    if (ecoleSlug) recordSyncEvent(ecoleSlug, 'push_fail', message)
    console.error('[sync-trigger]', message)
  }
}

/** Sync non bloquante des données école vers le cloud. */
export function pushSchoolDataFromEcoleId(ecoleId: string, ecoleSlug?: string): void {
  void pushSchoolDataFromEcoleIdAsync(ecoleId, ecoleSlug)
}
