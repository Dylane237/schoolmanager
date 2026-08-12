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
