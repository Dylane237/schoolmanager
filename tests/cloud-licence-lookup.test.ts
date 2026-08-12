import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../src/lib/supabase-admin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'ecoles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }
      }
      if (table !== 'licences') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'lic-1',
                      cle_licence: 'SM-TEST-KEY',
                      type: 'standard',
                      date_fin: '2027-12-31',
                      is_active: true,
                      ecole_slug: null,
                      ecole_id: 'mon-ecole',
                    },
                  }),
                }),
              }),
            }),
          }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      }
    },
  }),
}))

describe('fetchActiveCloudLicenceRecord', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('trouve une licence liée par ecole_id (ancienne prod)', async () => {
    const { fetchActiveCloudLicenceRecord } = await import('../src/lib/cloud-auth')
    const licence = await fetchActiveCloudLicenceRecord('mon-ecole')
    expect(licence?.cle_licence).toBe('SM-TEST-KEY')
    expect(licence?.type).toBe('standard')
    expect(licence?.date_fin).toBe('2027-12-31')
  })
})
