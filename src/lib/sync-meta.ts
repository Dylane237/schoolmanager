import 'server-only'
import fs from 'fs'
import path from 'path'
import { getLocalSyncMetaPath } from './paths'

export interface LocalSyncMeta {
  syncedVersion: number
  localEditVersion: number
  lastEditAt: string | null
  lastSyncAt: string | null
  lastError: string | null
  lastEvent: string | null
}

const DEFAULT_META: LocalSyncMeta = {
  syncedVersion: 0,
  localEditVersion: 0,
  lastEditAt: null,
  lastSyncAt: null,
  lastError: null,
  lastEvent: null,
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

export function markLocalEdited(ecoleSlug: string): void {
  const meta = readLocalSyncMeta(ecoleSlug)
  writeLocalSyncMeta(ecoleSlug, {
    localEditVersion: Math.max(meta.localEditVersion, Date.now()),
    lastEditAt: new Date().toISOString(),
  })
}

export function markLocalSynced(ecoleSlug: string, cloudVersion: number): void {
  writeLocalSyncMeta(ecoleSlug, {
    syncedVersion: cloudVersion,
    localEditVersion: cloudVersion,
    lastSyncAt: new Date().toISOString(),
    lastError: null,
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
