import { describe, expect, it, beforeEach } from 'vitest'
import { createMemoryDb, setTestDb } from '../src/lib/db'
import { ensureCloudRegisterSchoolData } from '../src/lib/school-db'

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
