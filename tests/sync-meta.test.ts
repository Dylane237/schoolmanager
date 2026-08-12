import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  readLocalSyncMeta,
  markLocalEdited,
  markLocalSynced,
  recordSyncError,
} from '@/lib/sync-meta'

const SLUG = 'test-ecole'
let tmpDir: string

describe('sync-meta', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-sync-meta-'))
    process.env.SM_USER_DATA = tmpDir
  })

  afterEach(() => {
    delete process.env.SM_USER_DATA
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('marque les éditions locales', () => {
    markLocalEdited(SLUG)
    const meta = readLocalSyncMeta(SLUG)
    expect(meta.localEditVersion).toBeGreaterThan(0)
    expect(meta.lastEditAt).toBeTruthy()
  })

  it('aligne les versions après sync', () => {
    markLocalEdited(SLUG)
    markLocalSynced(SLUG, 1234567890)
    const meta = readLocalSyncMeta(SLUG)
    expect(meta.syncedVersion).toBe(1234567890)
    expect(meta.localEditVersion).toBe(1234567890)
    expect(meta.lastError).toBeNull()
  })

  it('enregistre les erreurs', () => {
    recordSyncError(SLUG, 'Upload Storage échoué', 'push_fail')
    const meta = readLocalSyncMeta(SLUG)
    expect(meta.lastError).toBe('Upload Storage échoué')
    expect(meta.lastEvent).toBe('push_fail')
  })
})
