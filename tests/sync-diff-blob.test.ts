import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { diffBlobEntities, presenceKey } from '../src/lib/sync-diff-blob'

function seedEcole(db: Database.Database, id: string) {
  db.exec(`
    CREATE TABLE ecoles (id TEXT PRIMARY KEY, nom TEXT, slug TEXT);
    CREATE TABLE classes (id TEXT PRIMARY KEY, ecole_id TEXT, nom TEXT);
    CREATE TABLE eleves (id TEXT PRIMARY KEY, ecole_id TEXT, nom TEXT, prenom TEXT);
    CREATE TABLE personnel (
      id TEXT PRIMARY KEY, ecole_id TEXT, nom TEXT, prenom TEXT, type TEXT,
      telephone TEXT, email TEXT
    );
    CREATE TABLE matieres (
      id TEXT PRIMARY KEY, ecole_id TEXT, classe_id TEXT, nom TEXT, nom_en TEXT,
      coefficient REAL, section TEXT
    );
    CREATE TABLE frais_annexes (
      id TEXT PRIMARY KEY, ecole_id TEXT, classe_id TEXT, label TEXT, montant REAL,
      type TEXT, annee_scolaire TEXT, obligatoire INTEGER
    );
    CREATE TABLE presences (
      id TEXT PRIMARY KEY, ecole_id TEXT, eleve_id TEXT, date TEXT, statut TEXT, note TEXT
    );
    CREATE TABLE paiements (
      id TEXT PRIMARY KEY, ecole_id TEXT, eleve_id TEXT, montant REAL,
      date_paiement TEXT, tranche_numero INTEGER, recu_numero TEXT
    );
    CREATE TABLE notes (
      id TEXT PRIMARY KEY, ecole_id TEXT, eleve_id TEXT, matiere_id TEXT,
      periode TEXT, note REAL
    );
    CREATE TABLE tranches_config (
      id TEXT PRIMARY KEY, ecole_id TEXT, classe_id TEXT, tranche_numero INTEGER,
      montant_attendu REAL, date_limite TEXT, annee_scolaire TEXT
    );
  `)
  db.prepare('INSERT INTO ecoles (id, nom, slug) VALUES (?, ?, ?)').run(id, 'Test', 'test')
}

describe('diffBlobEntities extended', () => {
  it('detects personnel and matiere differences', () => {
    const local = new Database(':memory:')
    const cloud = new Database(':memory:')
    seedEcole(local, 'e1')
    seedEcole(cloud, 'e1')

    local.prepare(`
      INSERT INTO personnel (id, ecole_id, nom, prenom, type, telephone, email)
      VALUES ('p1', 'e1', 'Kamga', 'Jean', 'enseignant', '699', NULL)
    `).run()

    cloud.prepare(`
      INSERT INTO personnel (id, ecole_id, nom, prenom, type, telephone, email)
      VALUES ('p1', 'e1', 'Kamga', 'Paul', 'enseignant', '699', NULL)
    `).run()

    local.prepare(`
      INSERT INTO matieres (id, ecole_id, classe_id, nom, nom_en, coefficient, section)
      VALUES ('m1', 'e1', NULL, 'Maths', NULL, 2, 'francophone')
    `).run()

    const items = diffBlobEntities(local, cloud, 'e1', 'e1')
    local.close()
    cloud.close()

    expect(items.some(i => i.entity_type === 'personnel' && i.kind === 'both_modified')).toBe(true)
    expect(items.some(i => i.entity_type === 'matiere' && i.kind === 'local_only')).toBe(true)
  })

  it('detects presence by eleve and date key', () => {
    const local = new Database(':memory:')
    const cloud = new Database(':memory:')
    seedEcole(local, 'e1')
    seedEcole(cloud, 'e1')

    local.prepare('INSERT INTO eleves (id, ecole_id, nom, prenom) VALUES (?, ?, ?, ?)').run('el1', 'e1', 'A', 'B')
    cloud.prepare('INSERT INTO eleves (id, ecole_id, nom, prenom) VALUES (?, ?, ?, ?)').run('el1', 'e1', 'A', 'B')

    const key = presenceKey('el1', '2026-08-13')
    cloud.prepare(`
      INSERT INTO presences (id, ecole_id, eleve_id, date, statut, note)
      VALUES ('pr1', 'e1', 'el1', '2026-08-13', 'absent', NULL)
    `).run()

    const items = diffBlobEntities(local, cloud, 'e1', 'e1')
    local.close()
    cloud.close()

    expect(items.find(i => i.entity_type === 'presence' && i.entity_id === key)?.kind).toBe('cloud_only')
  })
})
