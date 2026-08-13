import 'server-only'
import fs from 'fs'
import path from 'path'
import { getLocalSyncMetaPath } from './paths'
import type { SyncChangeEntry } from './sync-changelog'

export interface LocalSyncMeta {
  syncedVersion: number
  localEditVersion: number
  lastEditAt: string | null
  /** Origine de la dernière modification locale (ex. api, login, eleves). */
  lastEditSource: string | null
  lastSyncAt: string | null
  lastError: string | null
  lastEvent: string | null
  lastAutoResolve: string | null
  pendingLocalChanges: SyncChangeEntry[]
  /** Cache local (desktop offline) — présence des deux plateformes. */
  platformPresence?: {
    desktop_ever_used: boolean
    web_ever_used: boolean
    updated_at: string
  }
}

const DEFAULT_META: LocalSyncMeta = {
  syncedVersion: 0,
  localEditVersion: 0,
  lastEditAt: null,
  lastEditSource: null,
  lastSyncAt: null,
  lastError: null,
  lastEvent: null,
  lastAutoResolve: null,
  pendingLocalChanges: [],
}

export function readLocalSyncMeta(ecoleSlug: string): LocalSyncMeta {
  const filePath = getLocalSyncMetaPath(ecoleSlug)
  if (!fs.existsSync(filePath)) return { ...DEFAULT_META }
  try {
    return { ...DEFAULT_META, ...JSON.parse(fs.readFileSync(filePath, 'utf8')) }
  } catch {
    return { ...DEFAULT_META }
  }
}

export function writeLocalSyncMeta(ecoleSlug: string, patch: Partial<LocalSyncMeta>): LocalSyncMeta {
  const current = readLocalSyncMeta(ecoleSlug)
  const next = { ...current, ...patch }
  const filePath = getLocalSyncMetaPath(ecoleSlug)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(next))
  return next
}

export function markLocalEdited(ecoleSlug: string, source?: string): void {
  const meta = readLocalSyncMeta(ecoleSlug)
  writeLocalSyncMeta(ecoleSlug, {
    localEditVersion: Math.max(meta.localEditVersion, Date.now()),
    lastEditAt: new Date().toISOString(),
    lastEditSource: source ?? meta.lastEditSource,
  })
}

export function recordAutoResolve(ecoleSlug: string, strategy: string, detail: string): void {
  writeLocalSyncMeta(ecoleSlug, {
    lastAutoResolve: `${strategy}: ${detail}`,
    lastError: null,
  })
}

export function markLocalSynced(ecoleSlug: string, cloudVersion: number): void {
  writeLocalSyncMeta(ecoleSlug, {
    syncedVersion: cloudVersion,
    localEditVersion: cloudVersion,
    lastSyncAt: new Date().toISOString(),
    lastError: null,
    pendingLocalChanges: [],
  })
}

export function recordSyncError(ecoleSlug: string, error: string, event = 'sync_error'): void {
  writeLocalSyncMeta(ecoleSlug, {
    lastError: error,
    lastEvent: event,
  })
}

export function recordSyncSuccess(ecoleSlug: string, cloudVersion: number, event = 'sync_ok'): void {
  writeLocalSyncMeta(ecoleSlug, {
    syncedVersion: cloudVersion,
    localEditVersion: cloudVersion,
    lastSyncAt: new Date().toISOString(),
    lastError: null,
    lastEvent: event,
  })
}
