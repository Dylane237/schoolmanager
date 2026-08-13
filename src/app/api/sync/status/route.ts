import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { requireModule } from '@/lib/rbac.server'
import { getCloudSyncStatus } from '@/lib/cloud-read'
import { fetchCloudDbMeta } from '@/lib/db-blob-sync'
import { detectSyncConflict, describeSyncSides, resolveSyncDisplayState } from '@/lib/sync-conflict'
import { fetchPlatformPresence } from '@/lib/platform-presence'
import { isSupabaseConfigured } from '@/lib/supabase-admin'
import { readLocalSyncMeta, writeLocalSyncMeta } from '@/lib/sync-meta'
import { getLastSyncEvent } from '@/lib/sync-monitor'

async function resolvePlatformPresenceForStatus(
  slug: string,
  meta: ReturnType<typeof readLocalSyncMeta>,
) {
  const cached = meta.platformPresence
  let desktopEverUsed = cached?.desktop_ever_used ?? false
  let webEverUsed = cached?.web_ever_used ?? false

  if (isSupabaseConfigured()) {
    try {
      const presence = await fetchPlatformPresence(slug)
      desktopEverUsed = presence.desktop_ever_used
      webEverUsed = presence.web_ever_used
      writeLocalSyncMeta(slug, {
        platformPresence: {
          desktop_ever_used: desktopEverUsed,
          web_ever_used: webEverUsed,
          updated_at: new Date().toISOString(),
        },
      })
    } catch {
      /* hors ligne ou cloud indisponible — conserver le cache local */
    }
  }

  return { desktopEverUsed, webEverUsed }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_slug) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const slug = user.ecole_slug
  let status = {
    configured: false,
    synced: false,
    synced_at: null as string | null,
    annee_scolaire: null as string | null,
    eleves_count: 0,
    classes_count: 0,
  }
  let dbMeta = null as Awaited<ReturnType<typeof fetchCloudDbMeta>>

  if (isSupabaseConfigured()) {
    try {
      status = await getCloudSyncStatus(slug)
      dbMeta = await fetchCloudDbMeta(slug)
    } catch {
      /* cloud indisponible (hors ligne) — suite avec cache local */
    }
  }

  const conflict = await detectSyncConflict(slug)
  let meta = readLocalSyncMeta(slug)
  const lastEvent = getLastSyncEvent(slug)
  const { desktopEverUsed, webEverUsed } = await resolvePlatformPresenceForStatus(slug, meta)

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
    desktop_ever_used: desktopEverUsed,
    web_ever_used: webEverUsed,
  })
}
