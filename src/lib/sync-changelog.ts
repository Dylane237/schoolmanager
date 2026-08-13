import 'server-only'
import { isServerlessRuntime } from './runtime-env'
import { readLocalSyncMeta, writeLocalSyncMeta } from './sync-meta'

export type SyncEntityType =
  | 'eleve'
  | 'classe'
  | 'paiement'
  | 'note'
  | 'tranche'
  | 'personnel'
  | 'matiere'
  | 'frais_annexe'
  | 'presence'
  | 'autre'
export type SyncChangeAction = 'create' | 'update' | 'delete'
export type SyncPlatform = 'desktop' | 'web'

export type SyncChangeEntry = {
  at: string
  platform: SyncPlatform
  entity_type: SyncEntityType
  entity_id: string | null
  action: SyncChangeAction
  label: string
  source: string
}

const MAX_PENDING = 80

export function recordLocalSyncChange(
  ecoleSlug: string,
  entry: Omit<SyncChangeEntry, 'at' | 'platform'>,
): void {
  const meta = readLocalSyncMeta(ecoleSlug)
  const pending = [...(meta.pendingLocalChanges ?? [])]
  pending.push({
    ...entry,
    at: new Date().toISOString(),
    platform: isServerlessRuntime() ? 'web' : 'desktop',
  })
  writeLocalSyncMeta(ecoleSlug, {
    pendingLocalChanges: pending.slice(-MAX_PENDING),
  })
}

export function clearPendingLocalChanges(ecoleSlug: string): void {
  writeLocalSyncMeta(ecoleSlug, { pendingLocalChanges: [] })
}

export function getPendingLocalChanges(ecoleSlug: string): SyncChangeEntry[] {
  return readLocalSyncMeta(ecoleSlug).pendingLocalChanges ?? []
}
