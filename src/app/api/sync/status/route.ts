import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getCloudSyncStatus } from '@/lib/cloud-read'
import { fetchCloudDbMeta } from '@/lib/db-blob-sync'
import { detectSyncConflict, describeSyncSides, resolveSyncDisplayState } from '@/lib/sync-conflict'
import { readLocalSyncMeta, writeLocalSyncMeta } from '@/lib/sync-meta'
import { getLastSyncEvent } from '@/lib/sync-monitor'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const slug = user.ecole_slug
  const status = await getCloudSyncStatus(slug)
  const dbMeta = await fetchCloudDbMeta(slug)
  const conflict = await detectSyncConflict(slug)
  let meta = readLocalSyncMeta(slug)
  const lastEvent = getLastSyncEvent(slug)

  const { syncState, dbSynced, clearStaleError } = resolveSyncDisplayState(conflict, dbMeta, meta)

  if (clearStaleError) {
    meta = writeLocalSyncMeta(slug, { lastError: null })
  }

  const syncedAt = meta.lastSyncAt ?? status.synced_at ?? dbMeta?.updated_at ?? null
  const conflictLog = conflict.hasConflict
    ? describeSyncSides(
      conflict,
      dbMeta?.updated_at ?? null,
      meta.lastEditAt,
      meta.lastEditSource,
    )
    : null

  return NextResponse.json({
    ...status,
    synced_at: syncedAt,
    db_synced: dbSynced,
    db_cloud_version: dbMeta?.version ?? null,
    db_local_version: conflict.localSyncedVersion,
    db_updated_at: dbMeta?.updated_at ?? null,
    readOnly: false,
    conflict: conflict.hasConflict,
    conflict_detail: conflict,
    conflict_log: conflictLog,
    last_auto_resolve: meta.lastAutoResolve,
    sync_state: syncState,
    last_sync_at: meta.lastSyncAt,
    last_error: syncState === 'error' ? meta.lastError : null,
    last_event: lastEvent?.type ?? meta.lastEvent,
  })
}
