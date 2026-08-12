import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { detectSyncConflict, resolveAutoSyncStrategy, describeSyncSides } from '@/lib/sync-conflict'
import { markLocalEdited, markLocalSynced } from '@/lib/sync-meta'
import { getLocalSyncVersionPath } from '@/lib/paths'

vi.mock('@/lib/db-blob-sync', () => ({
  fetchCloudDbMeta: vi.fn(),
}))

import { fetchCloudDbMeta } from '@/lib/db-blob-sync'

const SLUG = 'conflit-ecole'
let tmpDir: string

describe('detectSyncConflict', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-sync-conflict-'))
    process.env.SM_USER_DATA = tmpDir
    vi.mocked(fetchCloudDbMeta).mockReset()
  })

  afterEach(() => {
    delete process.env.SM_USER_DATA
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('pas de conflit si cloud et local alignés', async () => {
    vi.mocked(fetchCloudDbMeta).mockResolvedValue({
      ecole_slug: SLUG,
      storage_path: `${SLUG}/schoolmanager.db`,
      version: 1000,
      size_bytes: 100,
      checksum: 'abc',
      updated_at: new Date().toISOString(),
    })
    markLocalSynced(SLUG, 1000)
    fs.writeFileSync(getLocalSyncVersionPath(SLUG), '1000')

    const info = await detectSyncConflict(SLUG)
    expect(info.hasConflict).toBe(false)
  })

  it('conflit si cloud en avance et modifications locales', async () => {
    vi.mocked(fetchCloudDbMeta).mockResolvedValue({
      ecole_slug: SLUG,
      storage_path: `${SLUG}/schoolmanager.db`,
      version: 2000,
      size_bytes: 100,
      checksum: 'abc',
      updated_at: new Date().toISOString(),
    })
    markLocalSynced(SLUG, 1000)
    markLocalEdited(SLUG)
    fs.writeFileSync(getLocalSyncVersionPath(SLUG), '1000')

    const info = await detectSyncConflict(SLUG)
    expect(info.hasConflict).toBe(true)
    expect(info.cloudAhead).toBe(true)
    expect(info.localDirty).toBe(true)
  })

  it('auto-résolution: cloud plus récent → keep_cloud', () => {
    const conflict = {
      hasConflict: true,
      cloudVersion: 2000,
      localSyncedVersion: 1000,
      localEditVersion: 1500,
      cloudAhead: true,
      localDirty: true,
    }
    expect(resolveAutoSyncStrategy(conflict, '2026-08-12T18:00:00.000Z')).toBe('keep_cloud')
  })

  it('auto-résolution: bureau plus récent → keep_local', () => {
    const conflict = {
      hasConflict: true,
      cloudVersion: 2000,
      localSyncedVersion: 1000,
      localEditVersion: 3_000_000_000_000,
      cloudAhead: true,
      localDirty: true,
    }
    expect(resolveAutoSyncStrategy(conflict, '2026-08-12T10:00:00.000Z')).toBe('keep_local')
  })

  it('describeSyncSides inclut les deux plateformes', () => {
    const localMs = Date.parse('2026-08-12T18:00:00.000Z')
    const sides = describeSyncSides(
      {
        hasConflict: true,
        cloudVersion: 2000,
        localSyncedVersion: 1000,
        localEditVersion: localMs,
        cloudAhead: true,
        localDirty: true,
      },
      '2026-08-12T12:00:00.000Z',
      '2026-08-12T18:00:00.000Z',
      'eleves',
    )
    expect(sides.localSummary).toContain('Bureau modifié')
    expect(sides.cloudSummary).toContain('Cloud modifié')
    expect(sides.recommendation).toBe('keep_local')
  })
})
