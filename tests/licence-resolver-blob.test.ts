import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../src/lib/db-blob-sync', () => ({
  downloadSchoolDbBuffer: vi.fn(),
}))

vi.mock('../src/lib/supabase-admin', () => ({
  isSupabaseConfigured: () => false,
  getSupabaseAdmin: () => null,
}))

describe('fetchLicenceFromSchoolBlob', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns null without throwing when blob buffer is corrupt', async () => {
    const { downloadSchoolDbBuffer } = await import('../src/lib/db-blob-sync')
    vi.mocked(downloadSchoolDbBuffer).mockResolvedValue(Buffer.from('invalid sqlite bytes'))

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { fetchLicenceFromSchoolBlob } = await import('../src/lib/licence-resolver')
    const licence = await fetchLicenceFromSchoolBlob('ines-school')

    expect(licence).toBeNull()
    expect(warnSpy).toHaveBeenCalled()

    warnSpy.mockRestore()
  })

  it('returns null when download fails', async () => {
    const { downloadSchoolDbBuffer } = await import('../src/lib/db-blob-sync')
    vi.mocked(downloadSchoolDbBuffer).mockRejectedValue(new Error('network error'))

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { fetchLicenceFromSchoolBlob } = await import('../src/lib/licence-resolver')
    const licence = await fetchLicenceFromSchoolBlob('ines-school')

    expect(licence).toBeNull()
    warnSpy.mockRestore()
  })

  it('reads licence from on-disk SQLite blob bytes', async () => {
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const Database = (await import('better-sqlite3')).default

    const filePath = path.join(os.tmpdir(), `sm-licence-blob-${Date.now()}.db`)
    const fileDb = new Database(filePath)
    fileDb.exec(`
      CREATE TABLE ecoles (id TEXT PRIMARY KEY, slug TEXT);
      CREATE TABLE licences (
        id TEXT PRIMARY KEY, ecole_id TEXT, cle_licence TEXT, type TEXT,
        date_fin TEXT, is_active INTEGER
      );
    `)
    fileDb.prepare('INSERT INTO ecoles (id, slug) VALUES (?, ?)').run('ecole-1', 'ines-school')
    fileDb.prepare(`
      INSERT INTO licences (id, ecole_id, cle_licence, type, date_fin, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run('lic-1', 'ecole-1', 'TEST-KEY-1234', 'premium', '2099-12-31')
    fileDb.close()

    const fileBytes = fs.readFileSync(filePath)
    fs.unlinkSync(filePath)

    const { downloadSchoolDbBuffer } = await import('../src/lib/db-blob-sync')
    vi.mocked(downloadSchoolDbBuffer).mockResolvedValue(fileBytes)

    const { fetchLicenceFromSchoolBlob } = await import('../src/lib/licence-resolver')
    const licence = await fetchLicenceFromSchoolBlob('ines-school')

    expect(licence).toEqual({
      cle_licence: 'TEST-KEY-1234',
      type: 'premium',
      date_fin: '2099-12-31',
    })
  })
})
