import { getDb } from './db-server'
import { getMachineFingerprint } from './paths'
import { buildSchoolSyncPayload, type SchoolSyncPayload } from './sync-payload'
import { pushSchoolDataToCloud } from './data-cloud-sync'
import { pushSchoolDbFromLocal } from './school-db'

async function pushStructuredSync(payload: SchoolSyncPayload): Promise<void> {
  if (process.env.VERCEL) {
    const { upsertSchoolDataOnCloud } = await import('./cloud-data-store')
    await upsertSchoolDataOnCloud(payload)
    return
  }
  await pushSchoolDataToCloud(payload)
}

/** Sync des données structurées école → cloud (await). */
export async function pushSchoolDataFromEcoleIdAsync(
  ecoleId: string,
  ecoleSlug?: string,
): Promise<void> {
  try {
    const db = getDb(ecoleSlug)
    const ecole = db.prepare(
      'SELECT nom, slug FROM ecoles WHERE id = ?',
    ).get(ecoleId) as { nom: string; slug: string } | undefined

    const licence = db.prepare(`
      SELECT cle_licence, machine_fingerprint FROM licences
      WHERE ecole_id = ? AND is_active = 1 ORDER BY date_fin DESC LIMIT 1
    `).get(ecoleId) as { cle_licence: string; machine_fingerprint: string | null } | undefined

    if (!ecole?.slug || !licence?.cle_licence) return

    const payload = buildSchoolSyncPayload(
      db,
      ecoleId,
      ecole.slug,
      ecole.nom,
      licence.cle_licence,
      licence.machine_fingerprint || getMachineFingerprint(),
    )

    await pushStructuredSync(payload)

    if (!process.env.VERCEL) {
      await pushSchoolDbFromLocal(ecole.slug).catch(() => {})
    }
  } catch {
    // non bloquant
  }
}

/** Sync non bloquante des données école vers le cloud. */
export function pushSchoolDataFromEcoleId(ecoleId: string, ecoleSlug?: string): void {
  void pushSchoolDataFromEcoleIdAsync(ecoleId, ecoleSlug)
}
