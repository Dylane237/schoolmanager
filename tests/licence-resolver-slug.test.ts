import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('fetchActiveCloudLicenceRecord slug 11-2', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('résout via eq(ecole_slug) sans filtre .or() ambigu', async () => {
    vi.doMock('../src/lib/supabase-admin', () => ({
      isSupabaseConfigured: () => true,
      getSupabaseAdmin: () => ({
        from: (table: string) => {
          if (table === 'ecoles') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: 'uuid-11-2' } }),
                }),
              }),
            }
          }
          if (table !== 'licences') throw new Error(`unexpected table ${table}`)
          return {
            select: () => ({
              eq: (col: string, val: string | number) => {
                if (col === 'is_active' && val === 1) {
                  return {
                    eq: (col2: string, val2: string) => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => {
                            if (col2 === 'ecole_slug' && val2 === '11-2') {
                              return {
                                data: {
                                  id: 'lic-11-2',
                                  cle_licence: 'KEY-11-2',
                                  type: 'starter',
                                  date_fin: '2028-08-12',
                                  is_active: 1,
                                  ecole_slug: '11-2',
                                  ecole_id: 'uuid-11-2',
                                },
                              }
                            }
                            return { data: null }
                          },
                        }),
                      }),
                    }),
                  }
                }
                if (col === 'is_active') {
                  return {
                    eq: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({ data: null }),
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
        },
      }),
    }))

    vi.doMock('../src/lib/licence-cloud-sync', () => ({
      linkLicenceRowToEcole: vi.fn(),
    }))

    const { fetchActiveCloudLicenceRecord } = await import('../src/lib/licence-resolver')
    const licence = await fetchActiveCloudLicenceRecord('11-2')
    expect(licence?.type).toBe('starter')
    expect(licence?.date_fin).toBe('2028-08-12')
  })
})
