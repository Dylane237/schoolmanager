import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

vi.mock('../src/lib/supabase-admin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ count: 0 }),
      }),
    }),
  }),
}))

const upsertMock = vi.fn(async () => ({ ok: true, counts: { eleves: 2, classes: 1 } }))

vi.mock('../src/lib/cloud-data-store', () => ({
  upsertSchoolDataOnCloud: (...args: unknown[]) => upsertMock(...args),
  shouldSkipStructuredRegression: vi.fn(async () => false),
}))

vi.mock('../src/lib/sync-payload', () => ({
  buildSchoolSyncPayload: () => ({
    ecole_slug: 'test-school',
    ecole_nom: 'Test School',
    cle_licence: 'TEST-KEY',
    machine_fingerprint: 'fp',
    annee_scolaire: '2026-2027',
    classes: [{ local_id: 'c1', nom: 'CM1', nb_eleves: 1 }],
    eleves: [
      { local_id: 'el1', nom: 'A', prenom: 'B', statut: 'actif' },
      { local_id: 'el2', nom: 'C', prenom: 'D', statut: 'inactif' },
    ],
    payment_summaries: [],
    dashboard_stats: { totalEleves: 1 },
  }),
}))

function seedMinimalDb() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE ecoles (id TEXT PRIMARY KEY, nom TEXT, slug TEXT);
    CREATE TABLE licences (id TEXT PRIMARY KEY, ecole_id TEXT, cle_licence TEXT, is_active INTEGER, date_fin TEXT, machine_fingerprint TEXT);
  `)
  db.prepare('INSERT INTO ecoles (id, nom, slug) VALUES (?, ?, ?)').run('e1', 'Test School', 'test-school')
  db.prepare(`
    INSERT INTO licences (id, ecole_id, cle_licence, is_active, date_fin)
    VALUES (?, ?, ?, 1, '2099-12-31')
  `).run('l1', 'e1', 'TEST-KEY')
  return db
}

describe('syncStructuredFromEcoleDb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds payload from SQLite and upserts structured cloud data', async () => {
    const db = seedMinimalDb()
    const { syncStructuredFromEcoleDb } = await import('../src/lib/structured-sync')
    const result = await syncStructuredFromEcoleDb(db, 'test-school')
    db.close()

    expect(result.ok).toBe(true)
    expect(result.counts?.eleves).toBe(2)
    expect(result.counts?.eleves_actif).toBe(1)
    expect(upsertMock).toHaveBeenCalledOnce()
  })
})

describe('syncStructuredFromBuffer', () => {
  it('opens serialized buffer and syncs', async () => {
    const db = seedMinimalDb()
    const serialized = db.serialize()
    db.close()

    const { syncStructuredFromBuffer } = await import('../src/lib/structured-sync')
    const result = await syncStructuredFromBuffer('test-school', serialized)
    expect(result.ok).toBe(true)
    expect(result.counts?.eleves).toBe(2)
  })
})
