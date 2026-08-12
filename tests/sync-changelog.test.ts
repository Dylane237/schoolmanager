import { describe, it, expect } from 'vitest'

describe('cloudChangesFromDiff', () => {
  it('infère les changements web depuis le diff', async () => {
    const { cloudChangesFromDiff } = await import('../src/lib/sync-diff')
    const entries = cloudChangesFromDiff([
      {
        entity_type: 'eleve',
        entity_id: 'e1',
        label: 'Alice Martin',
        kind: 'cloud_only',
        local_summary: null,
        cloud_summary: 'Alice Martin, classe CM1',
        fields_changed: [],
      },
      {
        entity_type: 'eleve',
        entity_id: 'e2',
        label: 'Bob Dupont',
        kind: 'both_modified',
        local_summary: 'Bob Dupont, CM2',
        cloud_summary: 'Bob Dupont, CM1',
        fields_changed: ['classe'],
      },
    ])

    expect(entries).toHaveLength(2)
    expect(entries[0].platform).toBe('web')
    expect(entries[0].action).toBe('create')
    expect(entries[1].action).toBe('update')
    expect(entries[1].source).toContain('classe')
  })
})

describe('resolveAutoSyncStrategy', () => {
  it('reste exporté depuis sync-conflict', async () => {
    const { resolveAutoSyncStrategy } = await import('../src/lib/sync-conflict')
    expect(resolveAutoSyncStrategy({
      hasConflict: true,
      cloudVersion: 100,
      localSyncedVersion: 50,
      localEditVersion: Date.parse('2026-06-01T00:00:00Z'),
      cloudAhead: true,
      localDirty: true,
    }, '2026-01-01T00:00:00Z')).toBe('keep_local')
  })
})
