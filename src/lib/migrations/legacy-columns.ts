import type Database from 'better-sqlite3'

/** Colonnes / tables legacy (ex-migrations inline de db.ts) — migration 002. */
export function applyLegacyColumnMigrations(db: Database.Database): void {
  const cols = db.prepare(`PRAGMA table_info(notes)`).all() as { name: string }[]
  if (cols.find(c => c.name === 'note')) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes_new (
        id TEXT PRIMARY KEY,
        ecole_id TEXT REFERENCES ecoles(id) ON DELETE CASCADE,
        eleve_id TEXT REFERENCES eleves(id),
        matiere_id TEXT REFERENCES matieres(id),
        periode TEXT NOT NULL,
        note REAL CHECK (note >= 0 AND note <= 100),
        appreciation TEXT,
        saisie_par TEXT REFERENCES users(id),
        created_at TEXT DEFAULT (datetime('now'))
      );
    `)
    const hasOldConstraint = db.prepare(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='notes'
    `).get() as { sql: string } | undefined
    if (hasOldConstraint?.sql?.includes('<= 20')) {
      db.exec(`
        INSERT OR IGNORE INTO notes_new SELECT * FROM notes;
        DROP TABLE notes;
        ALTER TABLE notes_new RENAME TO notes;
        CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
        CREATE INDEX IF NOT EXISTS idx_notes_ecole ON notes(ecole_id, periode);
      `)
    } else {
      db.exec(`DROP TABLE IF EXISTS notes_new`)
    }
  }

  const classCols = db.prepare(`PRAGMA table_info(classes)`).all() as { name: string }[]
  if (!classCols.find(c => c.name === 'personnel_id')) {
    db.exec(`ALTER TABLE classes ADD COLUMN personnel_id TEXT REFERENCES personnel(id)`)
  }

  const licenceCols = db.prepare(`PRAGMA table_info(licences)`).all() as { name: string }[]
  if (!licenceCols.find(c => c.name === 'machine_fingerprint')) {
    db.exec(`ALTER TABLE licences ADD COLUMN machine_fingerprint TEXT`)
  }

  const ecoleCols = db.prepare(`PRAGMA table_info(ecoles)`).all() as { name: string }[]
  if (!ecoleCols.find(c => c.name === 'entete_url')) {
    db.exec(`ALTER TABLE ecoles ADD COLUMN entete_url TEXT`)
  }
  if (!ecoleCols.find(c => c.name === 'nom_caissier')) {
    db.exec(`ALTER TABLE ecoles ADD COLUMN nom_caissier TEXT`)
  }
  if (!ecoleCols.find(c => c.name === 'referral_code')) {
    db.exec(`ALTER TABLE ecoles ADD COLUMN referral_code TEXT`)
  }

  const userCols = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]
  if (!userCols.find(c => c.name === 'recovery_code_hash')) {
    db.exec(`ALTER TABLE users ADD COLUMN recovery_code_hash TEXT`)
  }

  const faCols = db.prepare(`PRAGMA table_info(frais_annexes)`).all() as { name: string }[]
  if (!faCols.find(c => c.name === 'type')) {
    db.exec(`ALTER TABLE frais_annexes ADD COLUMN type TEXT DEFAULT 'autre'`)
  }
  if (!faCols.find(c => c.name === 'date_limite')) {
    db.exec(`ALTER TABLE frais_annexes ADD COLUMN date_limite TEXT`)
  }

  const parrainageCols = db.prepare(`PRAGMA table_info(parrainages)`).all() as { name: string }[]
  if (parrainageCols.length > 0 && !parrainageCols.find(c => c.name === 'cloud_id')) {
    db.exec(`ALTER TABLE parrainages ADD COLUMN cloud_id TEXT`)
  }
}
