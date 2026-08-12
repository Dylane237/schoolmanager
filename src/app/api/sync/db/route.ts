import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import {
  pullSchoolDbToLocal,
  pushSchoolDbFromLocal,
  getDb,
  resolveEcoleId,
  prepareSchoolDb,
  markSchoolDbDirty,
} from '@/lib/db-server'
import { pushSchoolDataFromEcoleIdAsync } from '@/lib/sync-trigger'
import { detectSyncConflict, describeSyncSides } from '@/lib/sync-conflict'
import { fetchCloudDbMeta } from '@/lib/db-blob-sync'
import { readLocalSyncMeta } from '@/lib/sync-meta'
import { getLastSyncEvent } from '@/lib/sync-monitor'
import { withSchoolSyncLock } from '@/lib/sync-lock'

type SyncStrategy = 'keep_local' | 'keep_cloud'

async function runSchoolDbSync(
  slug: string,
  ecoleId: string | null | undefined,
  body: { strategy?: SyncStrategy },
) {
  let strategy = body.strategy

  const force = strategy === 'keep_local'
  const pullForce = strategy === 'keep_cloud'

  let pulled = false
  let pullVersion: number | undefined

  if (!process.env.VERCEL) {
    const pullResult = await pullSchoolDbToLocal(slug, { force: pullForce })
    pulled = pullResult.pulled
    pullVersion = pullResult.version
    if (pullResult.conflict && strategy !== 'keep_cloud') {
      const conflict = await detectSyncConflict(slug)
      const cloudMeta = await fetchCloudDbMeta(slug)
      const localMeta = readLocalSyncMeta(slug)
      return {
        status: 409 as const,
        body: {
          error: 'Conflit de synchronisation',
          conflict,
          conflict_log: describeSyncSides(
            conflict,
            cloudMeta?.updated_at ?? null,
            localMeta.lastEditAt,
            localMeta.lastEditSource,
          ),
        },
      }
    }
  }

  const pushResult = await pushSchoolDbFromLocal(slug, { force })
  if (pushResult.conflict && strategy !== 'keep_local') {
    const conflict = await detectSyncConflict(slug)
    const cloudMeta = await fetchCloudDbMeta(slug)
    const localMeta = readLocalSyncMeta(slug)
    return {
      status: 409 as const,
      body: {
        error: 'Conflit de synchronisation',
        conflict,
        conflict_log: describeSyncSides(
          conflict,
          cloudMeta?.updated_at ?? null,
          localMeta.lastEditAt,
          localMeta.lastEditSource,
        ),
      },
    }
  }

  if (!pushResult.ok) {
    return {
      status: 502 as const,
      body: { error: pushResult.error || 'Sync échouée' },
    }
  }

  const db = getDb(slug)
  const resolvedEcoleId = resolveEcoleId(db, slug, ecoleId)
  if (resolvedEcoleId) await pushSchoolDataFromEcoleIdAsync(resolvedEcoleId, slug)

  const conflict = await detectSyncConflict(slug)

  return {
    status: 200 as const,
    body: {
      success: true,
      pulled,
      pullVersion,
      pushVersion: pushResult.version,
      synced_at: new Date().toISOString(),
      conflict,
    },
  }
}

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

  if (process.env.VERCEL) {
    await prepareSchoolDb(slug)
    markSchoolDbDirty(slug, 'web-sync')
  }

  const result = await withSchoolSyncLock(slug, () =>
    runSchoolDbSync(slug, user.ecole_id, body),
  )

  return NextResponse.json(result.body, { status: result.status })
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const slug = user.ecole_slug
  const conflict = await detectSyncConflict(slug)
  const meta = readLocalSyncMeta(slug)
  const cloudMeta = await fetchCloudDbMeta(slug)
  const lastEvent = getLastSyncEvent(slug)

  return NextResponse.json({
    ...conflict,
    lastSyncAt: meta.lastSyncAt,
    lastError: meta.lastError,
    lastEvent: lastEvent?.type ?? meta.lastEvent,
    lastAutoResolve: meta.lastAutoResolve,
    conflict_log: conflict.hasConflict
      ? describeSyncSides(
        conflict,
        cloudMeta?.updated_at ?? null,
        meta.lastEditAt,
        meta.lastEditSource,
      )
      : null,
  })
}
