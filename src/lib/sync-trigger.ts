import { getDb } from './db-server'
import { getMachineFingerprint } from './paths'
import { buildSchoolSyncPayload } from './sync-payload'
import { pushSchoolDataToCloud } from './data-cloud-sync'

/** Sync non bloquante des données école vers le cloud (desktop uniquement). */
export function pushSchoolDataFromEcoleId(ecoleId: string): void {
  if (process.env.VERCEL) return

  try {
    const db = getDb()
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

    pushSchoolDataToCloud(payload).catch(() => {})
  } catch {
    // non bloquant
  }
}
