import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import { requireModule } from '@/lib/rbac.server'
import { buildSchoolSyncPayload } from '@/lib/sync-payload'
import { pushSchoolDataToCloud } from '@/lib/data-cloud-sync'
import { getMachineFingerprint } from '@/lib/paths'

/** Déclenche une sync manuelle desktop → cloud. */
export async function POST(request: NextRequest) {
  if (process.env.VERCEL) {
    return NextResponse.json({ error: 'Sync manuelle réservée au desktop' }, { status: 403 })
  }

  const user = await getUserFromRequest(request)
  if (!user?.ecole_id || !user.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const db = getDb()

  const ecole = db.prepare(
    'SELECT nom, slug FROM ecoles WHERE id = ?',
  ).get(user.ecole_id) as { nom: string; slug: string } | undefined

  const licence = db.prepare(`
    SELECT cle_licence, machine_fingerprint FROM licences
    WHERE ecole_id = ? AND is_active = 1 ORDER BY date_fin DESC LIMIT 1
  `).get(user.ecole_id) as { cle_licence: string; machine_fingerprint: string | null } | undefined

  if (!ecole || !licence?.cle_licence) {
    return NextResponse.json({ error: 'École ou licence introuvable' }, { status: 400 })
  }

  const payload = buildSchoolSyncPayload(
    db,
    user.ecole_id,
    ecole.slug,
    ecole.nom,
    licence.cle_licence,
    licence.machine_fingerprint || getMachineFingerprint(),
  )

  const result = await pushSchoolDataToCloud(payload)
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Sync échouée' }, { status: 502 })
  }

  return NextResponse.json({
    success: true,
    synced_at: new Date().toISOString(),
    counts: result.counts,
  })
}
