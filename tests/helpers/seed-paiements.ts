import bcrypt from 'bcryptjs'
import type Database from 'better-sqlite3'
import { createMemoryDb } from '@/lib/db'

export const TEST_ECOLE_ID = 'ecole-test-001'
export const TEST_USER_ID = 'user-test-001'
export const TEST_ELEVE_ID = 'eleve-test-001'
export const TEST_CLASSE_ID = 'classe-test-001'
export const TEST_ANNEE_ID = 'annee-test-001'
export const TEST_SLUG = 'ecole-test'

export function seedPaiementsFixture(db: Database.Database) {
  db.prepare(`
    INSERT INTO ecoles (id, nom, slug, directeur_nom, sections, email)
    VALUES (?, 'École Test', ?, 'Directeur Test', '["francophone"]', 'test@ecole.cm')
  `).run(TEST_ECOLE_ID, TEST_SLUG)

  db.prepare(`
    INSERT INTO annees_scolaires (id, ecole_id, label, date_debut, date_fin, is_active)
    VALUES (?, ?, '2026-2027', '2026-08-01', '2027-07-31', 1)
  `).run(TEST_ANNEE_ID, TEST_ECOLE_ID)

  const hash = bcrypt.hashSync('password123', 4)
  db.prepare(`
    INSERT INTO users (id, email, password_hash, nom, role, ecole_id)
    VALUES (?, 'admin@test.cm', ?, 'Admin Test', 'admin', ?)
  `).run(TEST_USER_ID, hash, TEST_ECOLE_ID)

  db.prepare(`
    INSERT INTO classes (id, ecole_id, nom, section, niveau, annee_scolaire, annee_scolaire_id)
    VALUES (?, ?, 'CM2 A', 'francophone', 'CM2', '2026-2027', ?)
  `).run(TEST_CLASSE_ID, TEST_ECOLE_ID, TEST_ANNEE_ID)

  db.prepare(`
    INSERT INTO eleves (id, ecole_id, classe_id, numero_matricule, nom, prenom, section, statut)
    VALUES (?, ?, ?, 'MAT-001', 'Dupont', 'Jean', 'francophone', 'actif')
  `).run(TEST_ELEVE_ID, TEST_ECOLE_ID, TEST_CLASSE_ID)

  db.prepare(`
    INSERT INTO tranches_config (id, ecole_id, classe_id, tranche_numero, montant_attendu, annee_scolaire, annee_scolaire_id)
    VALUES ('tranche-1', ?, ?, 1, 50000, '2026-2027', ?)
  `).run(TEST_ECOLE_ID, TEST_CLASSE_ID, TEST_ANNEE_ID)
}

export function createSeededMemoryDb() {
  const db = createMemoryDb()
  seedPaiementsFixture(db)
  return db
}
