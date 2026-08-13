import 'server-only'
import { fetchCloudDbMeta, type CloudDbSnapshotMeta } from './db-blob-sync'
import { getLocalSyncVersionPath } from './paths'
import { readLocalSyncMeta, writeLocalSyncMeta, type LocalSyncMeta } from './sync-meta'
import { isServerlessRuntime } from './runtime-env'
import fs from 'fs'

export type SyncDisplayState = 'synced' | 'pending' | 'conflict' | 'error'

export interface SyncConflictInfo {
  hasConflict: boolean
  cloudVersion: number | null
  localSyncedVersion: number
  localEditVersion: number
  cloudAhead: boolean
  localDirty: boolean
}

export type SyncStrategy = 'keep_local' | 'keep_cloud'

/** Dernière modification gagne (niveau base entière, pas merge ligne à ligne). */
export function resolveAutoSyncStrategy(
  conflict: SyncConflictInfo,
  cloudUpdatedAt: string | null,
): SyncStrategy {
  const cloudMs = cloudUpdatedAt
    ? Date.parse(cloudUpdatedAt)
    : (conflict.cloudVersion ?? 0)
  const localMs = conflict.localEditVersion
  return cloudMs >= localMs ? 'keep_cloud' : 'keep_local'
}

export function describeSyncSides(
  conflict: SyncConflictInfo,
  cloudUpdatedAt: string | null,
  localEditAt: string | null,
  localEditSource: string | null,
): {
  localSummary: string
  cloudSummary: string
  recommendation: SyncStrategy
} {
  const recommendation = resolveAutoSyncStrategy(conflict, cloudUpdatedAt)
  const localWhen = localEditAt ?? new Date(conflict.localEditVersion).toISOString()
  const cloudWhen = cloudUpdatedAt ?? (conflict.cloudVersion
    ? new Date(conflict.cloudVersion).toISOString()
    : 'inconnue')
  const localSource = localEditSource ? ` (${localEditSource})` : ''

  return {
    localSummary: `Bureau modifié le ${localWhen}${localSource}`,
    cloudSummary: `Cloud modifié le ${cloudWhen}`,
    recommendation,
  }
}

export function getLocalSyncedVersion(ecoleSlug: string): number {
  const versionPath = getLocalSyncVersionPath(ecoleSlug)
  if (!fs.existsSync(versionPath)) return 0
  return Number(fs.readFileSync(versionPath, 'utf8').trim()) || 0
}

export async function detectSyncConflict(ecoleSlug: string): Promise<SyncConflictInfo> {
  const cloudMeta = await fetchCloudDbMeta(ecoleSlug)
  const localMeta = readLocalSyncMeta(ecoleSlug)
  const localSyncedVersion = Math.max(
    getLocalSyncedVersion(ecoleSlug),
    localMeta.syncedVersion,
  )
  const cloudVersion = cloudMeta?.version ?? null

  const cloudAhead = cloudVersion !== null && cloudVersion > localSyncedVersion
  const localDirty = localMeta.localEditVersion > localSyncedVersion

  return {
    hasConflict: cloudAhead && localDirty,
    cloudVersion,
    localSyncedVersion,
    localEditVersion: localMeta.localEditVersion,
    cloudAhead,
    localDirty,
  }
}

/** État d'affichage unique sidebar + page Données (évite erreur fantôme / en attente sur web). */
export function resolveSyncDisplayState(
  conflict: SyncConflictInfo,
  dbMeta: CloudDbSnapshotMeta | null,
  meta: LocalSyncMeta,
): { syncState: SyncDisplayState; dbSynced: boolean; clearStaleError: boolean } {
  if (conflict.hasConflict) {
    return { syncState: 'conflict', dbSynced: false, clearStaleError: false }
  }

  if (conflict.localDirty) {
    return { syncState: 'pending', dbSynced: false, clearStaleError: false }
  }

  const dbSynced = isServerlessRuntime()
    ? dbMeta != null
    : dbMeta != null && dbMeta.version === conflict.localSyncedVersion

  if (dbSynced) {
    return { syncState: 'synced', dbSynced: true, clearStaleError: Boolean(meta.lastError) }
  }

  if (meta.lastError) {
    return { syncState: 'error', dbSynced: false, clearStaleError: false }
  }

  return { syncState: dbMeta ? 'pending' : 'pending', dbSynced: false, clearStaleError: false }
}
