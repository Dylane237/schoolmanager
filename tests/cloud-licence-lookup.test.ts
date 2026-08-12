import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../src/lib/licence-cloud-sync', () => ({
  linkLicenceRowToEcole: vi.fn(async () => ({ ok: true })),
}))

const licenceRow = {
  id: 'lic-1',
  cle_licence: 'SM-TEST-KEY',
  type: 'standard',
  date_fin: '2027-12-31',
  is_active: 1,
  ecole_slug: null,
  ecole_id: 'ecole-uuid-1',
}

vi.mock('../src/lib/supabase-admin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'ecoles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'ecole-uuid-1' } }),
            }),
          }),
        }
      }
      if (table === 'licences') {
        return {
          select: () => ({
            eq: (col: string, val: string | number) => {
              if (col === 'is_active' && val === 1) {
                return {
                  eq: (col2: string, val2: string) => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => {
                          if (col2 === 'ecole_slug') return { data: null }
                          if (col2 === 'ecole_id' && val2 === 'ecole-uuid-1') {
                            return { data: licenceRow }
                          }
                          return { data: null }
                        },
                      }),
                    }),
                  }),
                }
              }
              return {
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }
            },
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

describe('fetchActiveCloudLicenceRecord', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('trouve une licence liée par ecole_id UUID (ancienne prod)', async () => {
    const { fetchActiveCloudLicenceRecord } = await import('../src/lib/cloud-auth')
    const licence = await fetchActiveCloudLicenceRecord('mon-ecole')
    expect(licence?.cle_licence).toBe('SM-TEST-KEY')
    expect(licence?.type).toBe('standard')
    expect(licence?.date_fin).toBe('2027-12-31')
  })
})
