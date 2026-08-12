import { describe, expect, it, beforeEach } from 'vitest'
import { createMemoryDb, setTestDb } from '../src/lib/db'
import {
  ensureCloudRegisterSchoolData,
  ensureCloudLoginSchoolData,
  upsertActiveLicenceInDb,
} from '../src/lib/school-db'
import type { CloudLoginResult } from '../src/lib/cloud-auth'

describe('ensureCloudRegisterSchoolData', () => {
  beforeEach(() => {
    setTestDb(null)
  })

  it('crée école, licence active et admin après inscription cloud', () => {
    const db = createMemoryDb()
    setTestDb(db)

    const ecoleId = ensureCloudRegisterSchoolData(db, 'ecole-test', {
      nom_ecole: 'École Test',
      directeur_nom: 'Jean Dupont',
      telephone: '699000000',
      sections: ['francophone'],
      cle_licence: 'STANDARD-POOL-2026-ABCD1234',
      plan: 'standard',
      date_fin: '2027-12-31',
      email: 'directeur@ecole.cm',
      password_hash: '$2a$12$hashedpasswordplaceholder',
    })

    expect(ecoleId).toBeTruthy()

    const licence = db.prepare(`
      SELECT type, date_fin, is_active FROM licences
      WHERE ecole_id = ? AND is_active = 1
    `).get(ecoleId) as { type: string; date_fin: string; is_active: number }

    expect(licence.type).toBe('standard')
    expect(licence.date_fin).toBe('2027-12-31')
    expect(licence.is_active).toBe(1)

    const admin = db.prepare(`
      SELECT email, role FROM users WHERE ecole_id = ? AND role = 'admin'
    `).get(ecoleId) as { email: string; role: string }

    expect(admin.email).toBe('directeur@ecole.cm')
    expect(admin.role).toBe('admin')
  })

  it('est idempotent si la base est déjà provisionnée', () => {
    const db = createMemoryDb()
    setTestDb(db)

    const data = {
      nom_ecole: 'École Test',
      directeur_nom: 'Jean Dupont',
      cle_licence: 'STANDARD-POOL-2026-ABCD1234',
      plan: 'standard',
      date_fin: '2027-12-31',
      email: 'directeur@ecole.cm',
      password_hash: '$2a$12$hashedpasswordplaceholder',
    }

    const id1 = ensureCloudRegisterSchoolData(db, 'ecole-test', data)
    const id2 = ensureCloudRegisterSchoolData(db, 'ecole-test', data)

    expect(id1).toBe(id2)
    expect((db.prepare('SELECT COUNT(*) as n FROM ecoles').get() as { n: number }).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) as n FROM licences').get() as { n: number }).n).toBe(1)
    expect((db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }).n).toBe(1)
  })
})

describe('ensureCloudLoginSchoolData', () => {
  beforeEach(() => {
    setTestDb(null)
  })

  it('provisionne école et licence active après connexion cloud', () => {
    const db = createMemoryDb()
    setTestDb(db)

    const login: CloudLoginResult = {
      user: {
        id: 'cloud-user-1',
        account_id: 'account-1',
        role: 'admin',
        ecole_id: 'ecole-login',
        ecole_slug: 'ecole-login',
        nom: 'Marie Martin',
        auth_source: 'cloud',
      },
      password_hash: '$2a$12$hashedpasswordplaceholder',
      ecole_nom: 'École Login',
      directeur_nom: 'Marie Martin',
      cle_licence: 'STANDARD-POOL-2026-LOGIN01',
      licence_plan: 'standard',
      licence_date_fin: '2027-06-30',
    }

    const ecoleId = ensureCloudLoginSchoolData(db, 'ecole-login', login, 'marie@ecole.cm')
    expect(ecoleId).toBeTruthy()

    const licence = db.prepare(`
      SELECT type, date_fin, is_active FROM licences
      WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    `).get(ecoleId) as { type: string; date_fin: string; is_active: number }

    expect(licence.type).toBe('standard')
    expect(licence.date_fin).toBe('2027-06-30')
    expect(licence.is_active).toBe(1)
  })
})

describe('upsertActiveLicenceInDb', () => {
  beforeEach(() => {
    setTestDb(null)
  })

  it('met à jour une licence expirée avec une nouvelle clé', () => {
    const db = createMemoryDb()
    setTestDb(db)

    db.prepare(`
      INSERT INTO ecoles (nom, slug) VALUES ('Test', 'test-slug')
    `).run()
    const ecoleId = (db.prepare('SELECT id FROM ecoles WHERE slug = ?').get('test-slug') as { id: string }).id

    db.prepare(`
      INSERT INTO licences (ecole_id, type, date_debut, date_fin, is_active, cle_licence)
      VALUES (?, 'standard', date('now', '-400 days'), date('now', '-30 days'), 1, 'OLD-KEY')
    `).run(ecoleId)

    upsertActiveLicenceInDb(db, ecoleId, 'NEW-KEY-2026', 'premium', '2028-01-01')

    const active = db.prepare(`
      SELECT cle_licence, type, date_fin FROM licences
      WHERE ecole_id = ? AND is_active = 1 AND date_fin >= date('now')
    `).get(ecoleId) as { cle_licence: string; type: string; date_fin: string }

    expect(active.cle_licence).toBe('NEW-KEY-2026')
    expect(active.type).toBe('premium')
    expect(active.date_fin).toBe('2028-01-01')
  })
})
