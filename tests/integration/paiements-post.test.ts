import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type Database from 'better-sqlite3'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/paiements/route'
import { signToken, COOKIE_NAME } from '@/lib/auth'
import { setTestDb, createMemoryDb } from '@/lib/db'
import {
  createSeededMemoryDb,
  TEST_ECOLE_ID,
  TEST_USER_ID,
  TEST_ELEVE_ID,
  TEST_SLUG,
} from '../helpers/seed-paiements'

let testDb: Database.Database

async function postPaiement(body: Record<string, unknown>) {
  const token = await signToken({
    id: TEST_USER_ID,
    role: 'admin',
    ecole_id: TEST_ECOLE_ID,
    ecole_slug: TEST_SLUG,
    nom: 'Admin Test',
  })
  return POST(new NextRequest('http://localhost/api/paiements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${COOKIE_NAME}=${token}`,
    },
    body: JSON.stringify(body),
  }))
}

describe('API POST /api/paiements (intégration SQLite)', () => {
  beforeEach(() => {
    testDb = createSeededMemoryDb()
    setTestDb(testDb)
  })

  afterEach(() => {
    setTestDb(null)
  })

  it('enregistre un paiement tranche et crée une entrée audit', async () => {
    const res = await postPaiement({
      eleve_id: TEST_ELEVE_ID,
      tranche_numero: 1,
      montant: 25000,
      mode_paiement: 'especes',
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.recu_numero).toMatch(/^REC-\d{4}-\d{5}$/)

    const paiement = testDb.prepare(
      'SELECT montant, tranche_numero FROM paiements WHERE ecole_id = ?',
    ).get(TEST_ECOLE_ID) as { montant: number; tranche_numero: number }
    expect(paiement.montant).toBe(25000)
    expect(paiement.tranche_numero).toBe(1)

    const audit = testDb.prepare(
      'SELECT action, module FROM audit_log WHERE ecole_id = ?',
    ).get(TEST_ECOLE_ID) as { action: string; module: string }
    expect(audit.action).toBe('create')
    expect(audit.module).toBe('paiements')
  })

  it('rejette un élève inconnu', async () => {
    const res = await postPaiement({
      eleve_id: 'eleve-inconnu',
      tranche_numero: 1,
      montant: 1000,
      mode_paiement: 'especes',
    })
    expect(res.status).toBe(404)
  })

  it('rejette sans authentification', async () => {
    const res = await POST(new NextRequest('http://localhost/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eleve_id: TEST_ELEVE_ID,
        tranche_numero: 1,
        montant: 1000,
        mode_paiement: 'especes',
      }),
    }))
    expect(res.status).toBe(401)
  })
})

describe('migrations versionnées', () => {
  it('applique 001 audit_log et 002 legacy', () => {
    const db = createMemoryDb()
    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as { version: number }[]
    expect(versions.map(v => v.version)).toEqual([1, 2])

    const auditTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'",
    ).get()
    expect(auditTable).toBeTruthy()

    const parrainages = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='parrainages'",
    ).get()
    expect(parrainages).toBeTruthy()
  })
})
