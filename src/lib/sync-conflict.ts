import 'server-only'
import { fetchCloudDbMeta } from './db-blob-sync'
import { getLocalSyncVersionPath } from './paths'
import { readLocalSyncMeta } from './sync-meta'
import fs from 'fs'

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
