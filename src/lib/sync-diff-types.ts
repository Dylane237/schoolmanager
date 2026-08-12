import type { SyncEntityType, SyncChangeEntry } from './sync-changelog'

export type SyncDiffKind = 'local_only' | 'cloud_only' | 'both_modified'

export type SyncDiffItem = {
  entity_type: SyncEntityType
  entity_id: string
  label: string
  kind: SyncDiffKind
  local_summary: string | null
  cloud_summary: string | null
  fields_changed: string[]
}

export type SyncDiffReport = {
  has_differences: boolean
  items: SyncDiffItem[]
  local_pending: SyncChangeEntry[]
  summary: {
    local_only: number
    cloud_only: number
    both_modified: number
  }
}
