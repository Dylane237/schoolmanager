import 'server-only'
import { recordSyncError, recordSyncSuccess } from './sync-meta'

export type SyncEventType =
  | 'push_ok'
  | 'push_fail'
  | 'pull_ok'
  | 'pull_fail'
  | 'upload_push_ok'
  | 'upload_push_fail'
  | 'upload_pull_ok'
  | 'upload_pull_fail'
  | 'conflict'

const recentEvents = new Map<string, { type: SyncEventType; detail?: string; at: string }>()

export function recordSyncEvent(
  ecoleSlug: string,
  type: SyncEventType,
  detail?: string,
  cloudVersion?: number,
): void {
  const at = new Date().toISOString()
  recentEvents.set(ecoleSlug, { type, detail, at })

  const label = `[sync:${ecoleSlug}] ${type}${detail ? `: ${detail}` : ''}`
  if (type.endsWith('_fail') || type === 'conflict') {
    console.error(label)
    recordSyncError(ecoleSlug, detail ?? type, type)
  } else {
    console.info(label)
    if (cloudVersion !== undefined) {
      recordSyncSuccess(ecoleSlug, cloudVersion, type)
    }
  }
}

export function getLastSyncEvent(ecoleSlug: string) {
  return recentEvents.get(ecoleSlug) ?? null
}
