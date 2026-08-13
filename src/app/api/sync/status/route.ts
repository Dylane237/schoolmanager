import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getCloudSyncStatus } from '@/lib/cloud-read'
import { fetchCloudDbMeta } from '@/lib/db-blob-sync'
import { getLocalSyncVersionPath } from '@/lib/paths'
import { detectSyncConflict, describeSyncSides } from '@/lib/sync-conflict'
import { readLocalSyncMeta } from '@/lib/sync-meta'
import { getLastSyncEvent } from '@/lib/sync-monitor'
import fs from 'fs'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const slug = user.ecole_slug
  const status = await getCloudSyncStatus(slug)
  const dbMeta = await fetchCloudDbMeta(slug)
  const versionPath = getLocalSyncVersionPath(slug)
  const localVersion = fs.existsSync(versionPath)
    ? Number(fs.readFileSync(versionPath, 'utf8').trim()) || 0
    : 0
  const conflict = await detectSyncConflict(slug)
  const meta = readLocalSyncMeta(slug)
  const lastEvent = getLastSyncEvent(slug)

  let syncState: 'synced' | 'pending' | 'conflict' | 'error' = 'pending'
  if (conflict.hasConflict) syncState = 'conflict'
  else if (meta.lastError) syncState = 'error'
  else if (conflict.localDirty) syncState = 'pending'
  else if (dbMeta && dbMeta.version === localVersion) syncState = 'synced'

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
    db_synced: dbMeta ? dbMeta.version === localVersion && !conflict.localDirty : false,
    db_cloud_version: dbMeta?.version ?? null,
    db_local_version: localVersion,
    db_updated_at: dbMeta?.updated_at ?? null,
    readOnly: false,
    conflict: conflict.hasConflict,
    conflict_detail: conflict,
    conflict_log: conflictLog,
    last_auto_resolve: meta.lastAutoResolve,
    sync_state: syncState,
    last_sync_at: meta.lastSyncAt,
    last_error: meta.lastError,
    last_event: lastEvent?.type ?? meta.lastEvent,
  })
}
