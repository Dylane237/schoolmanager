import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import {
  pullSchoolDbToLocal,
  pushSchoolDbFromLocal,
  getDb,
  resolveEcoleId,
} from '@/lib/db-server'
import { pushSchoolDataFromEcoleId } from '@/lib/sync-trigger'
import { detectSyncConflict } from '@/lib/sync-conflict'
import { readLocalSyncMeta } from '@/lib/sync-meta'
import { getLastSyncEvent } from '@/lib/sync-monitor'

type SyncStrategy = 'keep_local' | 'keep_cloud'

/**
 * Sync bidirectionnelle base SQLite ↔ cloud.
 * Desktop : pull si cloud plus récent, puis push local.
 * Web : push uniquement (pull fait à chaque requête via prepareSchoolDb).
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const slug = user.ecole_slug
  let body: { strategy?: SyncStrategy } = {}
  try {
    body = await request.json()
  } catch {
    // body optionnel
  }

  const force = body.strategy === 'keep_local'
  const pullForce = body.strategy === 'keep_cloud'

  let pulled = false
  let pullVersion: number | undefined
  let conflict = await detectSyncConflict(slug)

  if (!process.env.VERCEL) {
    const pullResult = await pullSchoolDbToLocal(slug, { force: pullForce })
    pulled = pullResult.pulled
    pullVersion = pullResult.version
    if (pullResult.conflict && body.strategy !== 'keep_cloud') {
      return NextResponse.json({
        error: 'Conflit de synchronisation',
        conflict: await detectSyncConflict(slug),
      }, { status: 409 })
    }
  }

  const pushResult = await pushSchoolDbFromLocal(slug, { force })
  if (pushResult.conflict && body.strategy !== 'keep_local') {
    return NextResponse.json({
      error: 'Conflit de synchronisation',
      conflict: await detectSyncConflict(slug),
    }, { status: 409 })
  }

  if (!pushResult.ok) {
    return NextResponse.json({ error: pushResult.error || 'Sync échouée' }, { status: 502 })
  }

  const db = getDb()
  const ecoleId = resolveEcoleId(db, slug, user.ecole_id)
  if (ecoleId) pushSchoolDataFromEcoleId(ecoleId)

  conflict = await detectSyncConflict(slug)

  return NextResponse.json({
    success: true,
    pulled,
    pullVersion,
    pushVersion: pushResult.version,
    synced_at: new Date().toISOString(),
    conflict,
  })
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const conflict = await detectSyncConflict(user.ecole_slug)
  const meta = readLocalSyncMeta(user.ecole_slug)
  const lastEvent = getLastSyncEvent(user.ecole_slug)

  return NextResponse.json({
    ...conflict,
    lastSyncAt: meta.lastSyncAt,
    lastError: meta.lastError,
    lastEvent: lastEvent?.type ?? meta.lastEvent,
  })
}
