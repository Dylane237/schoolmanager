import type { SyncDiffItem, SyncDiffReport } from './sync-diff-types'

export type SyncNotificationItem = SyncDiffItem & { id: string }

/** Modifications présentes sur l'autre plateforme (cloud) et pas encore acceptées ici. */
export function incomingChangesFromDiff(items: SyncDiffItem[]): SyncNotificationItem[] {
  return items
    .filter(item => item.kind === 'cloud_only' || item.kind === 'both_modified')
    .map(item => ({ ...item, id: `${item.entity_type}:${item.entity_id}` }))
}

export function incomingChangeCount(report: Pick<SyncDiffReport, 'summary'>): number {
  return report.summary.cloud_only + report.summary.both_modified
}
