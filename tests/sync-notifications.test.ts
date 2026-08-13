import { describe, expect, it } from 'vitest'
import { incomingChangeCount, incomingChangesFromDiff } from '@/lib/sync-notifications'
import type { SyncDiffItem } from '@/lib/sync-diff-types'

const item = (kind: SyncDiffItem['kind'], id = '1'): SyncDiffItem => ({
  entity_type: 'eleve',
  entity_id: id,
  label: 'Test',
  kind,
  local_summary: null,
  cloud_summary: 'cloud',
  fields_changed: [],
})

describe('sync-notifications', () => {
  it('filters cloud_only and both_modified as incoming', () => {
    const items = [item('local_only'), item('cloud_only', '2'), item('both_modified', '3')]
    const incoming = incomingChangesFromDiff(items)
    expect(incoming).toHaveLength(2)
    expect(incoming.map(i => i.entity_id)).toEqual(['2', '3'])
  })

  it('counts incoming changes', () => {
    expect(incomingChangeCount({
      summary: { local_only: 1, cloud_only: 2, both_modified: 1 },
    })).toBe(3)
  })
})
