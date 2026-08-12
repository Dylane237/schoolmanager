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
})
